"""CLI tool — tìm official website URL cho danh sách khách sạn từ Excel."""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from openpyxl import load_workbook
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

from hotel_matcher_async import pick_url_for_hotel, get_match_explanation, get_improvement_tips
from stealth_enhancer import pick_identity, apply_stealth_to_context
from hotel_cache import get_cached, store_result, detect_duplicates, get_stats
from hotel_progress import ProgressTracker


class ErrorLogger:
    """Collect and export errors for debugging."""

    def __init__(self):
        self.errors = []  # List of {timestamp, hotel, worker, error_type, message}

    def add(self, hotel_name: str, worker_id: int, error_type: str, message: str):
        self.errors.append({
            "timestamp": datetime.now().isoformat(),
            "hotel": hotel_name,
            "worker": worker_id,
            "type": error_type,
            "message": str(message)[:500],
        })

    def get_summary(self) -> dict:
        if not self.errors:
            return {"total": 0, "by_type": {}}

        by_type = {}
        for e in self.errors:
            t = e["type"]
            by_type[t] = by_type.get(t, 0) + 1

        return {
            "total": len(self.errors),
            "by_type": by_type,
            "recent": self.errors[-5:],  # Last 5 errors
        }

    def export_to_file(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.errors, f, ensure_ascii=False, indent=2)
        return path


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


class PerformanceTracker:
    """Track processing performance metrics."""

    def __init__(self):
        self.start_time = None
        self.hotel_times = []  # List of (hotel_name, duration_seconds, status)
        self.worker_throughput = {}  # worker_id -> { processed, total_time }

    def start(self):
        self.start_time = time.time()

    def record_hotel(self, hotel_name: str, duration: float, status: str, worker_id: int = 0):
        self.hotel_times.append((hotel_name, duration, status))
        if worker_id not in self.worker_throughput:
            self.worker_throughput[worker_id] = {"processed": 0, "total_time": 0}
        self.worker_throughput[worker_id]["processed"] += 1
        self.worker_throughput[worker_id]["total_time"] += duration

    def get_summary(self) -> dict:
        if not self.hotel_times:
            return {}

        total_time = time.time() - self.start_time if self.start_time else 0
        durations = [t[1] for t in self.hotel_times]
        matched = [t for t in self.hotel_times if t[2] == "matched"]

        return {
            "total_time_seconds": round(total_time, 1),
            "hotels_processed": len(self.hotel_times),
            "hotels_matched": len(matched),
            "avg_time_per_hotel": round(sum(durations) / len(durations), 1) if durations else 0,
            "min_time": round(min(durations), 1) if durations else 0,
            "max_time": round(max(durations), 1) if durations else 0,
            "throughput_per_minute": round(len(self.hotel_times) / (total_time / 60), 1) if total_time > 0 else 0,
            "worker_stats": {
                wid: {
                    "processed": s["processed"],
                    "avg_time": round(s["total_time"] / s["processed"], 1) if s["processed"] > 0 else 0,
                }
                for wid, s in self.worker_throughput.items()
            },
        }


def emit_progress(data: dict, json_mode: bool):
    """Output progress — JSON mode: print JSON line, else: human readable."""
    if json_mode:
        print(json.dumps(data, ensure_ascii=False), flush=True)
    else:
        if data.get("type") == "row":
            no = data.get("no", "")
            processed = data.get("processed", "")
            total = data.get("total", "")
            status = data.get("status", "")
            name = data.get("hotel_name", "")
            url = data.get("url", "")
            log(f"  [No.{no}] ({processed}/{total}) [{status}] {name} -> {url}")
        elif data.get("type") == "done":
            log(f"Done! Output: {data.get('output', '')}")


def save_workbook(workbook, output_path: str):
    """Save workbook safely (write to temp then rename)."""
    tmp_path = output_path + ".tmp"
    workbook.save(tmp_path)
    Path(tmp_path).replace(output_path)


async def worker_task(browser, row, no_val, hotel_name, hotel_address, worker_id, max_retries=2, json_mode=False, perf_tracker=None, error_logger=None):
    """Each worker creates its own context (with a unique stealth identity) and one page.
    Checks cache first, retries up to max_retries times on transient errors."""

    hotel_start = time.time()

    # Emit worker start status
    if json_mode:
        emit_progress({
            "type": "worker_status",
            "worker_id": worker_id,
            "status": "starting",
            "hotel_name": hotel_name,
            "no": no_val,
        }, True)

    # Check cache first
    cached = get_cached(hotel_name, hotel_address)
    if cached:
        duration = time.time() - hotel_start
        log(f"[W{worker_id}] [No.{no_val}] CACHE HIT → {cached['url'][:60] or 'no url'} ({duration:.1f}s)")
        if perf_tracker:
            perf_tracker.record_hotel(hotel_name, duration, cached["status"], worker_id)
        if json_mode:
            emit_progress({
                "type": "worker_status",
                "worker_id": worker_id,
                "status": "cache_hit",
                "hotel_name": hotel_name,
                "no": no_val,
                "duration": round(duration, 1),
            }, True)
        return row, no_val, hotel_name, hotel_address, cached["url"], cached["engine"], cached["score"], cached["img_count"], cached["status"]

    identity = pick_identity(worker_id)

    for attempt in range(max_retries + 1):
        context = None
        page = None
        try:
            context = await browser.new_context(
                viewport=identity["viewport"],
                user_agent=identity["user_agent"],
            )
            await apply_stealth_to_context(context, identity)
            page = await context.new_page()

            if attempt > 0:
                log(f"[W{worker_id}] [No.{no_val}] RETRY {attempt}/{max_retries}")
            else:
                log(f"[W{worker_id}] [No.{no_val}] START {hotel_name}")

            # Emit searching status
            if json_mode:
                emit_progress({
                    "type": "worker_status",
                    "worker_id": worker_id,
                    "status": "searching",
                    "hotel_name": hotel_name,
                    "no": no_val,
                }, True)

            url, engine, score, img_count, status = await pick_url_for_hotel(page, hotel_name, hotel_address)

            # Store in cache
            store_result(hotel_name, hotel_address, url, engine, score, img_count, status)

            duration = time.time() - hotel_start
            if perf_tracker:
                perf_tracker.record_hotel(hotel_name, duration, status, worker_id)

            # Emit done status
            if json_mode:
                emit_progress({
                    "type": "worker_status",
                    "worker_id": worker_id,
                    "status": "done",
                    "hotel_name": hotel_name,
                    "no": no_val,
                    "result_status": status,
                    "duration": round(duration, 1),
                }, True)

            log(f"[W{worker_id}] [No.{no_val}] DONE  {status} ({duration:.1f}s)")
            return row, no_val, hotel_name, hotel_address, url, engine, score, img_count, status

        except Exception as e:
            error_msg = str(e)
            is_transient = any(kw in error_msg.lower() for kw in [
                "timeout", "connection", "network", "reset", "refused", "eof"
            ])

            if attempt < max_retries and is_transient:
                log(f"[W{worker_id}] [No.{no_val}] TRANSIENT ERROR (attempt {attempt + 1}): {error_msg[:100]}")
                await asyncio.sleep(2 * (attempt + 1))  # Exponential backoff
                continue

            log(f"[W{worker_id}] [No.{no_val}] ERROR {error_msg[:200]}")
            if error_logger:
                error_type = "transient" if is_transient else "permanent"
                error_logger.add(hotel_name, worker_id, error_type, error_msg)
            return row, no_val, hotel_name, hotel_address, "", "", 0, 0, "error"

        finally:
            if page:
                try:
                    await page.close()
                except Exception:
                    pass
            if context:
                try:
                    await context.close()
                except Exception:
                    pass

    # Should not reach here, but just in case
    return row, no_val, hotel_name, hotel_address, "", "", 0, 0, "error"


async def process_excel(input_path: str, output_path: str | None = None, json_mode: bool = False,
                        save_every: int = 10, resume: bool = False, workers: int = 1,
                        progress_file: str | None = None, clean_output: bool = False) -> str:
    # Initialize progress tracker
    if progress_file is None:
        progress_file = str(Path(input_path).with_suffix(".progress.json"))
    tracker = ProgressTracker(progress_file)

    workbook = load_workbook(input_path)
    sheet = workbook.active

    headers = [cell.value for cell in sheet[1]]
    # Validate required columns up front so a missing/misnamed header produces
    # a clear, actionable message instead of a raw ValueError traceback (which
    # the web UI would otherwise surface verbatim).
    required = ["child_hotel_name", "child_hotel_address"]
    missing = [c for c in required if c not in headers]
    if missing:
        found = ", ".join(str(h) for h in headers if h)
        print(
            f"ERROR: File Excel thiếu cột bắt buộc: {', '.join(missing)}. "
            f"Cột yêu cầu: child_hotel_name, child_hotel_address. "
            f"Các cột tìm thấy: {found or '(trống)'}",
            file=sys.stderr,
        )
        sys.exit(1)
    name_idx = headers.index("child_hotel_name") + 1
    addr_idx = headers.index("child_hotel_address") + 1

    url_col = len(headers) + 1
    engine_col = len(headers) + 2
    score_col = len(headers) + 3
    img_col = len(headers) + 4
    status_col = len(headers) + 5

    # Add headers if not present
    if not sheet.cell(row=1, column=url_col).value:
        sheet.cell(row=1, column=url_col, value="official_website_url")
        sheet.cell(row=1, column=engine_col, value="search_engine_used")
        sheet.cell(row=1, column=score_col, value="match_score_address")
        sheet.cell(row=1, column=img_col, value="image_count")
        sheet.cell(row=1, column=status_col, value="status")

    # Generate output path if not provided
    if not output_path:
        input_obj = Path(input_path)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = str(input_obj.parent / f"{input_obj.stem}_output_{ts}.xlsx")

    # Count valid rows (skip empty rows)
    completed_rows = tracker.get_completed_rows() if resume else set()
    if completed_rows:
        log(f"Progress file found: {len(completed_rows)} rows already completed")

    valid_rows = []
    row_data = []  # For duplicate detection
    for row in range(2, sheet.max_row + 1):
        hotel_name = (sheet.cell(row=row, column=name_idx).value or "").strip()
        hotel_address = (sheet.cell(row=row, column=addr_idx).value or "").strip()
        if not hotel_name or not hotel_address:
            continue
        if resume:
            # Skip if already completed (from progress file OR Excel)
            if row in completed_rows:
                continue
            existing_url = (sheet.cell(row=row, column=url_col).value or "").strip()
            if existing_url:
                continue
        valid_rows.append(row)
        row_data.append((hotel_name, hotel_address))

    # Detect duplicates
    duplicates = detect_duplicates(row_data)
    dup_count = sum(len(indices) - 1 for indices in duplicates.values())
    if dup_count > 0:
        log(f"Detected {dup_count} duplicate entries (will reuse first occurrence results)")

    total_valid = len(valid_rows)
    log(f"Found {total_valid} valid rows to process (out of {sheet.max_row - 1} total)")
    log(f"Using {workers} worker(s)")

    # Initialize progress tracker
    tracker.set_input_output(input_path, output_path, total_valid)

    # Log cache stats
    cache_stats = get_stats()
    if cache_stats["total_entries"] > 0:
        log(f"Cache: {cache_stats['total_entries']} entries, {cache_stats['total_hits']} hits, {cache_stats['matched_entries']} matched")

    if total_valid == 0:
        log("No valid rows to process. Saving and exiting.")
        save_workbook(workbook, output_path)
        tracker.mark_completed()
        emit_progress({"type": "done", "output": output_path, "total": 0}, json_mode)
        return output_path

    emit_progress({"type": "start", "total": total_valid}, json_mode)

    processed = 0
    last_save = 0
    worker_stats = {i: {"processed": 0, "errors": 0} for i in range(1, workers + 1)}
    perf = PerformanceTracker()
    perf.start()
    error_logger = ErrorLogger()

    # Adaptive batch sizing
    current_batch_size = workers
    min_batch_size = 1
    max_batch_size = workers * 2
    recent_errors = []  # Track recent error rates

    async with Stealth().use_async(async_playwright()) as p:
        browser = await p.chromium.launch(headless=True)

        # Process in batches with adaptive sizing
        batch_start = 0
        while batch_start < total_valid:
            batch = valid_rows[batch_start:batch_start + current_batch_size]

            tasks = []
            for i, row in enumerate(batch):
                no_val = sheet.cell(row=row, column=1).value
                hotel_name = (sheet.cell(row=row, column=name_idx).value or "").strip()
                hotel_address = (sheet.cell(row=row, column=addr_idx).value or "").strip()
                tasks.append(worker_task(browser, row, no_val, hotel_name, hotel_address, i + 1, json_mode=json_mode, perf_tracker=perf, error_logger=error_logger))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Adaptive batch sizing based on error rate
            error_count = sum(1 for r in results if isinstance(r, Exception) or (isinstance(r, tuple) and r[8] == "error"))
            error_rate = error_count / len(batch) if batch else 0
            recent_errors.append(error_rate)
            if len(recent_errors) > 5:
                recent_errors.pop(0)

            avg_error_rate = sum(recent_errors) / len(recent_errors) if recent_errors else 0

            # Adjust batch size
            if avg_error_rate > 0.5:
                # High error rate: reduce batch size
                current_batch_size = max(min_batch_size, current_batch_size - 1)
                log(f"  High error rate ({avg_error_rate:.0%}), reducing batch size to {current_batch_size}")
            elif avg_error_rate < 0.1 and len(recent_errors) >= 3:
                # Low error rate: increase batch size
                current_batch_size = min(max_batch_size, current_batch_size + 1)

            # Adaptive delay between batches
            if error_count > 0:
                delay = min(5, 1 + error_count)
                log(f"  Batch had {error_count} errors, waiting {delay}s before next batch")
                await asyncio.sleep(delay)
            elif workers > 1:
                await asyncio.sleep(0.5)

            batch_start += len(batch)

            for result in results:
                if isinstance(result, Exception):
                    log(f"  Worker exception: {result}")
                    continue

                row, no_val, hotel_name, hotel_address, url, engine, score, img_count, status = result

                # Update worker stats
                worker_id = (batch.index(row) % workers) + 1 if row in batch else 0
                if worker_id in worker_stats:
                    worker_stats[worker_id]["processed"] += 1
                    if status == "error":
                        worker_stats[worker_id]["errors"] += 1
                sheet.cell(row=row, column=url_col, value=url)
                sheet.cell(row=row, column=engine_col, value=engine)
                sheet.cell(row=row, column=score_col, value=score)
                sheet.cell(row=row, column=img_col, value=img_count)
                sheet.cell(row=row, column=status_col, value=status)

                # Add annotations for problematic rows
                from openpyxl.comments import Comment
                
                if status == "error":
                    # Add comment to status cell
                    comment = Comment("This row encountered an error during processing", "Hotel URL Finder")
                    sheet.cell(row=row, column=status_col).comment = comment
                    # Highlight entire row with light red
                    from openpyxl.styles import PatternFill
                    error_fill = PatternFill(start_color="FFE0E0", end_color="FFE0E0", fill_type="solid")
                    for col in range(1, status_col + 1):
                        sheet.cell(row=row, column=col).fill = error_fill
                        
                elif status == "no-valid-result":
                    # Add comment for no result
                    comment = Comment("No valid website found for this hotel", "Hotel URL Finder")
                    sheet.cell(row=row, column=status_col).comment = comment
                    # Highlight with light yellow
                    from openpyxl.styles import PatternFill
                    warning_fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")
                    for col in range(1, status_col + 1):
                        sheet.cell(row=row, column=col).fill = warning_fill
                        
                elif score and int(score) < 50:
                    # Flag low score matches
                    comment = Comment(f"Low confidence match (score: {score}). Verify manually.", "Hotel URL Finder")
                    sheet.cell(row=row, column=score_col).comment = comment

                # Track progress
                tracker.mark_row_done(row)

                processed += 1
                # Generate suggestions for low scores
                suggestions = []
                explanation = ""
                if score and int(score) > 0:
                    explanation = get_match_explanation(int(score), img_count or 0)
                    if int(score) < 70:
                        suggestions = get_improvement_tips(hotel_name, hotel_address, int(score))
                
                emit_progress({
                    "type": "row",
                    "no": no_val,
                    "row": row,
                    "processed": processed,
                    "total": total_valid,
                    "hotel_name": hotel_name,
                    "hotel_address": hotel_address,
                    "status": status,
                    "url": url,
                    "score": score,
                    "img_count": img_count,
                    "explanation": explanation,
                    "suggestions": suggestions,
                }, json_mode)

            # Save checkpoint after each batch
            if processed - last_save >= save_every:
                save_workbook(workbook, output_path)
                last_save = processed
                log(f"  [checkpoint] Saved progress: {processed}/{total_valid}")

        await browser.close()

    # Apply export template
    template = EXPORT_FORMAT_OPTIONS.get("template", "full")
    apply_export_template(workbook, template, sheet, total_valid, url_col, engine_col, score_col, img_col, status_col, workers, worker_stats)
    log(f"Applied export template: {template}")

    # Final save
    save_workbook(workbook, output_path)

    # Clean output: create a separate file with only results
    if clean_output:
        clean_path = str(Path(output_path).with_suffix("")) + "_clean.xlsx"
        _create_clean_output(workbook, sheet, clean_path, url_col, engine_col, score_col, img_col, status_col)
        log(f"Clean output saved: {clean_path}")

    # Mark progress as completed and cleanup
    tracker.mark_completed()
    ProgressTracker.cleanup(progress_file)

    # Calculate final stats
    total_errors = sum(s["errors"] for s in worker_stats.values())
    total_processed = sum(s["processed"] for s in worker_stats.values())
    log(f"Complete: {total_processed} processed, {total_errors} errors across {workers} workers")
    for wid, stats in worker_stats.items():
        if stats["processed"] > 0:
            log(f"  Worker {wid}: {stats['processed']} processed, {stats['errors']} errors")

    perf_summary = perf.get_summary()
    error_summary = error_logger.get_summary()
    log(f"Performance: {perf_summary.get('throughput_per_minute', 0)} hotels/min, avg {perf_summary.get('avg_time_per_hotel', 0)}s/hotel")
    if error_summary["total"] > 0:
        log(f"Errors: {error_summary['total']} total - {error_summary['by_type']}")

    # Export error log if there were errors
    error_log_path = None
    if error_summary["total"] > 0:
        error_log_path = str(Path(output_path).with_suffix(".errors.json"))
        error_logger.export_to_file(error_log_path)
        log(f"Error log saved: {error_log_path}")

    # Compress to ZIP if requested
    zip_path = None
    if EXPORT_FORMAT_OPTIONS.get("zip", False):
        import zipfile
        zip_path = str(Path(output_path).with_suffix(".zip"))
        log(f"Compressing to ZIP: {zip_path}")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add main output
            zf.write(output_path, Path(output_path).name)
            log(f"  Added: {Path(output_path).name}")
            
            # Add clean output if exists
            if clean_output and Path(clean_path).exists():
                zf.write(clean_path, Path(clean_path).name)
                log(f"  Added: {Path(clean_path).name}")
            
            # Add error log if exists
            if error_log_path and Path(error_log_path).exists():
                zf.write(error_log_path, Path(error_log_path).name)
                log(f"  Added: {Path(error_log_path).name}")
        
        # Get file sizes
        original_size = Path(output_path).stat().st_size
        compressed_size = Path(zip_path).stat().st_size
        ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
        
        log(f"Compression complete: {original_size / 1024:.1f}KB → {compressed_size / 1024:.1f}KB ({ratio:.1f}% reduction)")

    # Send email notification if configured
    email = EXPORT_FORMAT_OPTIONS.get("email")
    email_on_error = EXPORT_FORMAT_OPTIONS.get("email_on_error", False)
    
    if email and (not email_on_error or total_errors > 0):
        # Calculate stats for email
        matched = sum(1 for r in range(2, total_valid + 2) if (sheet.cell(row=r, column=status_col).value or "").strip() == "matched")
        no_result = sum(1 for r in range(2, total_valid + 2) if (sheet.cell(row=r, column=status_col).value or "").strip() == "no-valid-result")
        scores = [int(sheet.cell(row=r, column=score_col).value or 0) for r in range(2, total_valid + 2) if sheet.cell(row=r, column=score_col).value]
        avg_score = sum(scores) // len(scores) if scores else 0
        processing_time = perf_summary.get('total_time', 0)
        
        # Create email report
        email_body = create_email_report(
            total_valid, matched, no_result, total_errors, 
            avg_score, processing_time, output_path
        )
        
        # Determine attachment
        attachment = zip_path if zip_path else output_path
        
        # Send email
        subject = f"Hotel URL Finder - Job Complete ({matched}/{total_valid} matched)"
        send_email_notification(email, subject, email_body, attachment)

    # Send webhook notification if configured
    webhook_url = EXPORT_FORMAT_OPTIONS.get("webhook")
    webhook_on_error = EXPORT_FORMAT_OPTIONS.get("webhook_on_error", False)
    
    if webhook_url and (not webhook_on_error or total_errors > 0):
        webhook_payload = {
            "event": "job_complete",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "output": output_path,
                "zip": zip_path,
                "total": total_valid,
                "processed": total_processed,
                "errors": total_errors,
                "workers": workers,
                "performance": perf_summary,
                "error_summary": error_summary,
            }
        }
        send_webhook_notification(webhook_url, webhook_payload)

    emit_progress({
        "type": "done",
        "output": output_path,
        "zip": zip_path,
        "total": total_valid,
        "processed": total_processed,
        "errors": total_errors,
        "workers": workers,
        "performance": perf_summary,
        "error_summary": error_summary,
        "error_log": error_log_path,
    }, json_mode)
    return output_path


def _create_clean_output(workbook, data_sheet, clean_path, url_col, engine_col, score_col, img_col, status_col):
    """Create a clean output file with only essential columns and formatting."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    clean_wb = Workbook()
    clean_ws = clean_wb.active
    clean_ws.title = "Results"

    # Status color mapping
    status_colors = {
        "matched": PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid"),
        "no-valid-result": PatternFill(start_color="FFF3E0", end_color="FFF3E0", fill_type="solid"),
        "error": PatternFill(start_color="FFEBEE", end_color="FFEBEE", fill_type="solid"),
    }
    status_fonts = {
        "matched": Font(color="2E7D32"),
        "no-valid-result": Font(color="E65100"),
        "error": Font(color="C62828"),
    }

    # Headers
    headers = ["Hotel Name", "Address", "Official URL", "Score", "Images", "Status"]
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="1a73e8", end_color="1a73e8", fill_type="solid")

    for col, header in enumerate(headers, 1):
        cell = clean_ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    # Freeze header row and first 2 columns (name, address)
    clean_ws.freeze_panes = "C2"

    # Data rows
    row_idx = 2
    for row in range(2, data_sheet.max_row + 1):
        status = (data_sheet.cell(row=row, column=status_col).value or "").strip()
        if not status:
            continue

        # Write data
        clean_ws.cell(row=row_idx, column=1, value=data_sheet.cell(row=row, column=1).value)
        clean_ws.cell(row=row_idx, column=2, value=data_sheet.cell(row=row, column=2).value)

        # URL as hyperlink
        url = data_sheet.cell(row=row, column=url_col).value
        if url:
            cell = clean_ws.cell(row=row_idx, column=3, value=url)
            cell.hyperlink = url
            cell.font = Font(color="1a73e8", underline="single")
        else:
            clean_ws.cell(row=row_idx, column=3, value="")

        # Score with conditional formatting (background + font)
        score = data_sheet.cell(row=row, column=score_col).value
        score_cell = clean_ws.cell(row=row_idx, column=4, value=score)
        if score:
            score_val = int(score)
            if score_val >= 80:
                score_cell.font = Font(color="2E7D32", bold=True)
                score_cell.fill = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")
            elif score_val >= 50:
                score_cell.font = Font(color="E65100", bold=True)
                score_cell.fill = PatternFill(start_color="FFF3E0", end_color="FFF3E0", fill_type="solid")
            else:
                score_cell.font = Font(color="C62828", bold=True)
                score_cell.fill = PatternFill(start_color="FFEBEE", end_color="FFEBEE", fill_type="solid")

    # Add data bars to score column (after all rows are written)
    try:
        from openpyxl.formatting.rule import DataBarRule
        if row_idx > 2:  # Only if there are data rows
            rule = DataBarRule(
                start_type="num",
                start_value=0,
                end_type="num",
                end_value=100,
                color="638EC6",
                showValue=True,
            )
            clean_ws.conditional_formatting.add(f"D2:D{row_idx - 1}", rule)
    except Exception:
        pass  # Data bars not critical

        clean_ws.cell(row=row_idx, column=5, value=data_sheet.cell(row=row, column=img_col).value)

        # Status with color coding
        status_cell = clean_ws.cell(row=row_idx, column=6, value=status)
        if status in status_colors:
            for col in range(1, 7):
                clean_ws.cell(row=row_idx, column=col).fill = status_colors[status]
            status_cell.font = status_fonts.get(status, Font())

        row_idx += 1

    # Summary row
    row_idx += 1
    summary_fill = PatternFill(start_color="E3F2FD", end_color="E3F2FD", fill_type="solid")
    summary_font = Font(bold=True, size=11)

    # Calculate summary stats
    matched_count = sum(1 for r in range(2, data_sheet.max_row + 1) if (data_sheet.cell(row=r, column=status_col).value or "").strip() == "matched")
    no_result_count = sum(1 for r in range(2, data_sheet.max_row + 1) if (data_sheet.cell(row=r, column=status_col).value or "").strip() == "no-valid-result")
    error_count = sum(1 for r in range(2, data_sheet.max_row + 1) if (data_sheet.cell(row=r, column=status_col).value or "").strip() == "error")
    total_imgs = sum(int(data_sheet.cell(row=r, column=img_col).value or 0) for r in range(2, data_sheet.max_row + 1))
    scores = [int(data_sheet.cell(row=r, column=score_col).value or 0) for r in range(2, data_sheet.max_row + 1) if data_sheet.cell(row=r, column=score_col).value]
    avg_score = sum(scores) // len(scores) if scores else 0

    summary_data = [
        ("SUMMARY", "", "", "", "", ""),
        ("", "", "Matched:", matched_count, "", ""),
        ("", "", "No Result:", no_result_count, "", ""),
        ("", "", "Errors:", error_count, "", ""),
        ("", "", "Total Images:", total_imgs, "", ""),
        ("", "", "Avg Score:", f"{avg_score}%", "", ""),
    ]

    for data in summary_data:
        for col, val in enumerate(data, 1):
            cell = clean_ws.cell(row=row_idx, column=col, value=val)
            cell.fill = summary_fill
            cell.font = summary_font
        row_idx += 1

    # Add metadata sheet
    meta_ws = clean_wb.create_sheet("Metadata")
    meta_data = [
        ("Field", "Value"),
        ("Export Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("Total Rows", row_idx - 2),
        ("Matched", matched_count),
        ("No Result", no_result_count),
        ("Errors", error_count),
        ("Total Images", total_imgs),
        ("Average Score", f"{avg_score}%"),
    ]
    for r, (field, value) in enumerate(meta_data, 1):
        meta_ws.cell(row=r, column=1, value=field)
        meta_ws.cell(row=r, column=2, value=value)
        if r == 1:
            meta_ws.cell(row=r, column=1).font = Font(bold=True)
            meta_ws.cell(row=r, column=2).font = Font(bold=True)
    meta_ws.column_dimensions["A"].width = 20
    meta_ws.column_dimensions["B"].width = 30

    # Auto-width columns based on content
    from openpyxl.utils import get_column_letter
    min_widths = {1: 8, 2: 20, 3: 30, 4: 8, 5: 8, 6: 12}
    max_widths = {1: 15, 2: 50, 3: 60, 4: 12, 5: 12, 6: 20}

    for col_idx in range(1, 7):
        max_len = 0
        for row in clean_ws.iter_rows(min_col=col_idx, max_col=col_idx, values_only=True):
            if row[0]:
                max_len = max(max_len, len(str(row[0])))
        # Calculate width with padding
        calculated = max_len + 3
        # Apply min/max constraints
        final_width = max(min_widths.get(col_idx, 10), min(max_widths.get(col_idx, 50), calculated))
        clean_ws.column_dimensions[get_column_letter(col_idx)].width = final_width

    clean_wb.save(clean_path)


def _add_summary_sheet(workbook, data_sheet, total_rows, url_col, engine_col, score_col, status_col, workers, worker_stats):
    """Add a summary sheet with statistics to the workbook."""
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    # Remove existing summary sheet if present
    if "Summary" in workbook.sheetnames:
        del workbook["Summary"]

    summary = workbook.create_sheet("Summary", 0)  # Insert at beginning

    # Collect stats
    matched = 0
    no_result = 0
    errors = 0
    scores = []
    engines = {}

    for row in range(2, data_sheet.max_row + 1):
        status = (data_sheet.cell(row=row, column=status_col).value or "").strip()
        score = data_sheet.cell(row=row, column=score_col).value or 0
        engine = (data_sheet.cell(row=row, column=engine_col).value or "").strip()

        if status == "matched":
            matched += 1
            if score:
                scores.append(int(score))
        elif status == "no-valid-result":
            no_result += 1
        elif status == "error":
            errors += 1

        if engine:
            engines[engine] = engines.get(engine, 0) + 1

    # Styles
    header_font = Font(bold=True, size=14, color="FFFFFF")
    header_fill = PatternFill(start_color="1a73e8", end_color="1a73e8", fill_type="solid")
    label_font = Font(bold=True, size=11)
    value_font = Font(size=11)
    border = Border(
        bottom=Side(style="thin", color="CCCCCC"),
    )

    # Title
    summary.merge_cells("A1:D1")
    summary["A1"] = "Hotel URL Finder - Summary Report"
    summary["A1"].font = header_font
    summary["A1"].fill = header_fill
    summary["A1"].alignment = Alignment(horizontal="center")

    # Overall stats
    row = 3
    summary.cell(row=row, column=1, value="Overall Statistics").font = Font(bold=True, size=12, color="1a73e8")
    row += 1

    stats = [
        ("Total Hotels", total_rows),
        ("Matched", matched),
        ("No Result", no_result),
        ("Errors", errors),
        ("Match Rate", f"{(matched / total_rows * 100):.1f}%" if total_rows > 0 else "N/A"),
        ("Average Score", f"{(sum(scores) / len(scores)):.0f}" if scores else "N/A"),
        ("Workers Used", workers),
    ]

    for label, value in stats:
        summary.cell(row=row, column=1, value=label).font = label_font
        summary.cell(row=row, column=2, value=str(value)).font = value_font
        summary.cell(row=row, column=1).border = border
        summary.cell(row=row, column=2).border = border
        row += 1

    # Search engine distribution
    row += 1
    summary.cell(row=row, column=1, value="Search Engine Distribution").font = Font(bold=True, size=12, color="1a73e8")
    row += 1

    for engine, count in sorted(engines.items(), key=lambda x: -x[1]):
        summary.cell(row=row, column=1, value=engine).font = label_font
        summary.cell(row=row, column=2, value=count).font = value_font
        summary.cell(row=row, column=3, value=f"{(count / total_rows * 100):.1f}%").font = value_font
        summary.cell(row=row, column=1).border = border
        row += 1

    # Worker stats
    row += 1
    summary.cell(row=row, column=1, value="Worker Performance").font = Font(bold=True, size=12, color="1a73e8")
    row += 1

    for wid in sorted(worker_stats.keys()):
        stats = worker_stats[wid]
        if stats["processed"] > 0:
            summary.cell(row=row, column=1, value=f"Worker {wid}").font = label_font
            summary.cell(row=row, column=2, value=f"{stats['processed']} processed").font = value_font
            summary.cell(row=row, column=3, value=f"{stats['errors']} errors").font = value_font
            summary.cell(row=row, column=1).border = border
            row += 1

    # Score distribution
    if scores:
        row += 1
        summary.cell(row=row, column=1, value="Score Distribution").font = Font(bold=True, size=12, color="1a73e8")
        row += 1
        
        ranges = [
            ("90-100%", lambda s: 90 <= s <= 100),
            ("80-89%", lambda s: 80 <= s < 90),
            ("70-79%", lambda s: 70 <= s < 80),
            ("60-69%", lambda s: 60 <= s < 70),
            ("50-59%", lambda s: 50 <= s < 60),
            ("< 50%", lambda s: s < 50),
        ]
        
        for label, condition in ranges:
            count = sum(1 for s in scores if condition(s))
            if count > 0:
                pct = count / len(scores) * 100
                bar = "█" * int(pct / 5)  # Simple bar visualization
                summary.cell(row=row, column=1, value=label).font = label_font
                summary.cell(row=row, column=2, value=count).font = value_font
                summary.cell(row=row, column=3, value=f"{pct:.1f}%").font = value_font
                summary.cell(row=row, column=4, value=bar).font = Font(color="1a73e8")
                row += 1

    # Top 10 highest scored
    if scores:
        row += 1
        summary.cell(row=row, column=1, value="Top 10 Highest Scores").font = Font(bold=True, size=12, color="3ba55d")
        row += 1

        top_scores = []
        for r in range(2, data_sheet.max_row + 1):
            score = data_sheet.cell(row=r, column=score_col).value
            name = data_sheet.cell(row=r, column=1).value
            url = data_sheet.cell(row=r, column=url_col).value
            if score and int(score) > 0:
                top_scores.append((int(score), str(name or ""), str(url or "")))

        top_scores.sort(reverse=True)
        for score, name, url in top_scores[:10]:
            summary.cell(row=row, column=1, value=name[:30]).font = value_font
            summary.cell(row=row, column=2, value=f"{score}%").font = Font(bold=True, color="3ba55d")
            summary.cell(row=row, column=3, value=url[:50]).font = value_font
            row += 1

    # Top 10 lowest scored (matched only)
    if scores:
        row += 1
        summary.cell(row=row, column=1, value="Top 10 Lowest Scores").font = Font(bold=True, size=12, color="ff4d4f")
        row += 1

        bottom_scores = []
        for r in range(2, data_sheet.max_row + 1):
            status = (data_sheet.cell(row=r, column=status_col).value or "").strip()
            if status == "matched":
                score = data_sheet.cell(row=r, column=score_col).value
                name = data_sheet.cell(row=r, column=1).value
                url = data_sheet.cell(row=r, column=url_col).value
                if score and int(score) > 0:
                    bottom_scores.append((int(score), str(name or ""), str(url or "")))

        bottom_scores.sort()
        for score, name, url in bottom_scores[:10]:
            summary.cell(row=row, column=1, value=name[:30]).font = value_font
            summary.cell(row=row, column=2, value=f"{score}%").font = Font(bold=True, color="ff4d4f")
            summary.cell(row=row, column=3, value=url[:50]).font = value_font
            row += 1

    # Processing timeline
    row += 1
    summary.cell(row=row, column=1, value="Processing Info").font = Font(bold=True, size=12, color="1a73e8")
    row += 1
    
    from datetime import datetime
    summary.cell(row=row, column=1, value="Export Date").font = label_font
    summary.cell(row=row, column=2, value=datetime.now().strftime("%Y-%m-%d %H:%M:%S")).font = value_font
    row += 1
    
    summary.cell(row=row, column=1, value="Total Processed").font = label_font
    summary.cell(row=row, column=2, value=total_rows).font = value_font
    row += 1
    
    if matched > 0:
        summary.cell(row=row, column=1, value="Success Rate").font = label_font
        summary.cell(row=row, column=2, value=f"{(matched / total_rows * 100):.1f}%").font = Font(bold=True, color="3ba55d")

    # Add charts
    try:
        from openpyxl.chart import PieChart, BarChart, Reference
        from openpyxl.chart.label import DataLabelList
        from openpyxl.chart.series import DataPoint
        
        # Prepare data for charts
        chart_data_row = row + 3
        summary.cell(row=chart_data_row, column=1, value="Category")
        summary.cell(row=chart_data_row, column=2, value="Count")
        
        summary.cell(row=chart_data_row + 1, column=1, value="Matched")
        summary.cell(row=chart_data_row + 1, column=2, value=matched)
        
        summary.cell(row=chart_data_row + 2, column=1, value="No Result")
        summary.cell(row=chart_data_row + 2, column=2, value=no_result)
        
        summary.cell(row=chart_data_row + 3, column=1, value="Errors")
        summary.cell(row=chart_data_row + 3, column=2, value=errors)
        
        # Hide data rows (make font white)
        for r in range(chart_data_row, chart_data_row + 4):
            for c in range(1, 3):
                summary.cell(row=r, column=c).font = Font(color="FFFFFF")
        
        # Pie Chart - Match Rate
        pie = PieChart()
        pie.title = "Match Rate Distribution"
        pie.style = 10
        pie.width = 15
        pie.height = 10
        
        data = Reference(summary, min_col=2, min_row=chart_data_row, max_row=chart_data_row + 3)
        cats = Reference(summary, min_col=1, min_row=chart_data_row + 1, max_row=chart_data_row + 3)
        pie.add_data(data, titles_from_data=True)
        pie.set_categories(cats)
        
        # Color slices
        from openpyxl.chart.series import DataPoint
        from openpyxl.drawing.fill import PatternFillProperties, ColorChoice
        
        slice_colors = ["3ba55d", "faa61a", "ff4d4f"]
        for i, color in enumerate(slice_colors):
            pt = DataPoint(idx=i)
            pt.graphicalProperties.solidFill = color
            pie.series[0].data_points.append(pt)
        
        # Data labels
        pie.series[0].dLbls = DataLabelList()
        pie.series[0].dLbls.showPercent = True
        pie.series[0].dLbls.showCatName = True
        
        summary.add_chart(pie, "F3")
        
        # Bar Chart - Score Distribution
        if scores:
            score_ranges = [
                ("90-100%", sum(1 for s in scores if 90 <= s <= 100)),
                ("80-89%", sum(1 for s in scores if 80 <= s < 90)),
                ("70-79%", sum(1 for s in scores if 70 <= s < 80)),
                ("60-69%", sum(1 for s in scores if 60 <= s < 70)),
                ("50-59%", sum(1 for s in scores if 50 <= s < 60)),
                ("<50%", sum(1 for s in scores if s < 50)),
            ]
            
            bar_data_row = chart_data_row + 5
            summary.cell(row=bar_data_row, column=1, value="Score Range")
            summary.cell(row=bar_data_row, column=2, value="Count")
            
            for i, (range_name, count) in enumerate(score_ranges):
                summary.cell(row=bar_data_row + 1 + i, column=1, value=range_name)
                summary.cell(row=bar_data_row + 1 + i, column=2, value=count)
                summary.cell(row=bar_data_row + 1 + i, column=1).font = Font(color="FFFFFF")
                summary.cell(row=bar_data_row + 1 + i, column=2).font = Font(color="FFFFFF")
            
            bar = BarChart()
            bar.type = "col"
            bar.title = "Score Distribution"
            bar.style = 10
            bar.width = 15
            bar.height = 10
            bar.y_axis.title = "Number of Hotels"
            
            data = Reference(summary, min_col=2, min_row=bar_data_row, max_row=bar_data_row + 6)
            cats = Reference(summary, min_col=1, min_row=bar_data_row + 1, max_row=bar_data_row + 6)
            bar.add_data(data, titles_from_data=True)
            bar.set_categories(cats)
            
            # Color bars
            bar_colors = ["3ba55d", "3ba55d", "1a73e8", "1a73e8", "faa61a", "ff4d4f"]
            for i, color in enumerate(bar_colors):
                pt = DataPoint(idx=i)
                pt.graphicalProperties.solidFill = color
                bar.series[0].data_points.append(pt)
            
            summary.add_chart(bar, "F18")
        
    except Exception as e:
        log(f"Warning: Could not add charts: {e}")

    # Auto-width columns
    summary.column_dimensions["A"].width = 25
    summary.column_dimensions["B"].width = 15
    summary.column_dimensions["C"].width = 15
    summary.column_dimensions["D"].width = 50


def _add_notes_sheet(workbook, data_sheet, total_rows, url_col, score_col, status_col, workers, worker_stats):
    """Add a Notes sheet with processing details and flagged items."""
    from openpyxl.styles import Font, PatternFill, Alignment
    from datetime import datetime
    
    # Remove existing notes sheet if present
    if "Notes" in workbook.sheetnames:
        del workbook["Notes"]
    
    notes = workbook.create_sheet("Notes")
    
    # Styles
    header_font = Font(bold=True, size=14, color="FFFFFF")
    header_fill = PatternFill(start_color="ff9c00", end_color="ff9c00", fill_type="solid")
    section_font = Font(bold=True, size=12, color="1a73e8")
    label_font = Font(bold=True, size=11)
    value_font = Font(size=11)
    warning_font = Font(color="ff4d4f")
    
    # Title
    notes.merge_cells("A1:D1")
    notes["A1"] = "Processing Notes & Flagged Items"
    notes["A1"].font = header_font
    notes["A1"].fill = header_fill
    notes["A1"].alignment = Alignment(horizontal="center")
    
    # Processing summary
    row = 3
    notes.cell(row=row, column=1, value="Processing Summary").font = section_font
    row += 1
    
    notes.cell(row=row, column=1, value="Export Date").font = label_font
    notes.cell(row=row, column=2, value=datetime.now().strftime("%Y-%m-%d %H:%M:%S")).font = value_font
    row += 1
    
    notes.cell(row=row, column=1, value="Total Hotels Processed").font = label_font
    notes.cell(row=row, column=2, value=total_rows).font = value_font
    row += 2
    
    # Flagged items section
    notes.cell(row=row, column=1, value="Flagged Items for Review").font = section_font
    row += 1
    
    # Headers for flagged items
    notes.cell(row=row, column=1, value="Row #").font = label_font
    notes.cell(row=row, column=2, value="Hotel Name").font = label_font
    notes.cell(row=row, column=3, value="Issue").font = label_font
    notes.cell(row=row, column=4, value="Recommendation").font = label_font
    row += 1
    
    # Collect flagged items
    flagged_count = 0
    for r in range(2, data_sheet.max_row + 1):
        status = (data_sheet.cell(row=r, column=status_col).value or "").strip()
        score = data_sheet.cell(row=r, column=score_col).value
        name = data_sheet.cell(row=r, column=1).value
        
        issues = []
        recommendations = []
        
        if status == "error":
            issues.append("Processing Error")
            recommendations.append("Retry or check input data")
        elif status == "no-valid-result":
            issues.append("No Result Found")
            recommendations.append("Try manual search or verify hotel name")
        elif score and int(score) < 50:
            issues.append(f"Low Score ({score}%)")
            recommendations.append("Verify URL manually")
        
        if issues:
            flagged_count += 1
            notes.cell(row=row, column=1, value=r - 1).font = value_font  # Row number (1-indexed)
            notes.cell(row=row, column=2, value=str(name or "")[:40]).font = value_font
            notes.cell(row=row, column=3, value=", ".join(issues)).font = warning_font
            notes.cell(row=row, column=4, value=", ".join(recommendations)).font = value_font
            row += 1
    
    # Summary of flagged items
    row += 1
    notes.cell(row=row, column=1, value="Total Flagged Items").font = label_font
    notes.cell(row=row, column=2, value=flagged_count).font = Font(bold=True, color="ff4d4f" if flagged_count > 0 else "3ba55d")
    row += 1
    
    if flagged_count > 0:
        notes.cell(row=row, column=1, value="⚠ Items above require manual review").font = Font(italic=True, color="ff9c00")
    
    # Auto-width columns
    notes.column_dimensions["A"].width = 15
    notes.column_dimensions["B"].width = 35
    notes.column_dimensions["C"].width = 25
    notes.column_dimensions["D"].width = 35


def _add_auto_filter_sheets(workbook, data_sheet, total_rows, url_col, score_col, img_col, status_col):
    """Add separate sheets for each status category with color-coded tabs."""
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    
    # Define status categories with colors
    categories = [
        ("Matched", "matched", "3ba55d", "E8F5E9"),      # Green tab, light green bg
        ("No Result", "no-valid-result", "faa61a", "FFF8E1"),  # Yellow tab, light yellow bg
        ("Errors", "error", "ff4d4f", "FFEBEE"),          # Red tab, light red bg
    ]
    
    # Get headers from data sheet
    headers = []
    for col in range(1, data_sheet.max_column + 1):
        headers.append(data_sheet.cell(row=1, column=col).value or f"Col {col}")
    
    for sheet_name, status_filter, tab_color, bg_color in categories:
        # Remove existing sheet if present
        if sheet_name in workbook.sheetnames:
            del workbook[sheet_name]
        
        new_sheet = workbook.create_sheet(sheet_name)
        new_sheet.sheet_properties.tabColor = tab_color
        
        # Header style
        header_font = Font(bold=True, size=11, color="FFFFFF")
        header_fill = PatternFill(start_color=tab_color, end_color=tab_color, fill_type="solid")
        border = Border(bottom=Side(style="thin", color="CCCCCC"))
        
        # Write headers
        for col, header in enumerate(headers, 1):
            cell = new_sheet.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        # Copy matching rows
        row_idx = 2
        data_bg = PatternFill(start_color=bg_color, end_color=bg_color, fill_type="solid")
        
        for r in range(2, data_sheet.max_row + 1):
            status = (data_sheet.cell(row=r, column=status_col).value or "").strip()
            if status == status_filter:
                for col in range(1, data_sheet.max_column + 1):
                    cell = new_sheet.cell(row=row_idx, column=col)
                    cell.value = data_sheet.cell(row=r, column=col).value
                    cell.fill = data_bg
                row_idx += 1
        
        # Auto-width columns
        for col in range(1, len(headers) + 1):
            max_width = len(str(headers[col - 1] or ""))
            for r in range(2, min(row_idx, 20)):  # Sample first 20 rows
                val = str(new_sheet.cell(row=r, column=col).value or "")
                max_width = max(max_width, len(val))
            new_sheet.column_dimensions[get_column_letter(col)].width = min(max_width + 2, 50)
        
        # Add count in header
        count = row_idx - 2
        new_sheet.cell(row=1, column=len(headers) + 1, value=f"Count: {count}").font = Font(bold=True, color=tab_color)


def _apply_conditional_styling(sheet, total_rows, score_col, img_col, status_col):
    """Apply advanced conditional styling to the main data sheet."""
    try:
        from openpyxl.formatting.rule import ColorScaleRule, DataBarRule, IconSetRule
        from openpyxl.styles import Font, PatternFill
        
        if total_rows < 2:
            return
        
        last_row = total_rows + 1  # +1 for header
        
        # 1. Color scale for score column (red -> yellow -> green)
        try:
            color_scale = ColorScaleRule(
                start_type="num", start_value=0, start_color="FF4D4F",
                mid_type="num", mid_value=50, mid_color="FFC107",
                end_type="num", end_value=100, end_color="3BA55D"
            )
            sheet.conditional_formatting.add(f"{score_col}2:{score_col}{last_row}", color_scale)
        except Exception:
            pass
        
        # 2. Data bars for image count column
        try:
            data_bar = DataBarRule(
                start_type="num", start_value=0,
                end_type="max",
                color="2196F3",
                showValue=True
            )
            sheet.conditional_formatting.add(f"{img_col}2:{img_col}{last_row}", data_bar)
        except Exception:
            pass
        
        # 3. Icon sets for scores (arrows)
        try:
            icon_set = IconSetRule(
                icon_style="3Arrows",
                type="num",
                values=[0, 50, 80],
                showValue=True
            )
            # Add to a helper column or skip if not supported
        except Exception:
            pass
        
        # 4. Custom number format for score column
        from openpyxl.styles.numbers import FORMAT_PERCENTAGE_00
        for row in range(2, last_row + 1):
            cell = sheet.cell(row=row, column=score_col)
            if cell.value:
                try:
                    # Add % suffix if not already present
                    val = str(cell.value)
                    if not val.endswith("%"):
                        cell.value = f"{val}%"
                except Exception:
                    pass
        
    except Exception as e:
        log(f"Warning: Could not apply conditional styling: {e}")


def _add_validation_report(workbook, data_sheet, total_rows, name_col, addr_col, url_col, score_col, status_col):
    """Add a Validation Report sheet with data quality metrics."""
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from datetime import datetime
    
    # Remove existing validation sheet if present
    if "Validation Report" in workbook.sheetnames:
        del workbook["Validation Report"]
    
    validation = workbook.create_sheet("Validation Report")
    validation.sheet_properties.tabColor = "9c27b0"  # Purple tab
    
    # Styles
    header_font = Font(bold=True, size=14, color="FFFFFF")
    header_fill = PatternFill(start_color="9c27b0", end_color="9c27b0", fill_type="solid")
    section_font = Font(bold=True, size=12, color="9c27b0")
    label_font = Font(bold=True, size=11)
    value_font = Font(size=11)
    good_font = Font(color="3ba55d", bold=True)
    warning_font = Font(color="faa61a", bold=True)
    error_font = Font(color="ff4d4f", bold=True)
    
    # Title
    validation.merge_cells("A1:D1")
    validation["A1"] = "Data Validation Report"
    validation["A1"].font = header_font
    validation["A1"].fill = header_fill
    validation["A1"].alignment = Alignment(horizontal="center")
    
    # Data Quality Metrics
    row = 3
    validation.cell(row=row, column=1, value="Data Quality Metrics").font = section_font
    row += 1
    
    # Count metrics
    total_names = 0
    empty_names = 0
    total_addrs = 0
    empty_addrs = 0
    total_urls = 0
    empty_urls = 0
    scores = []
    statuses = {}
    
    for r in range(2, data_sheet.max_row + 1):
        name = data_sheet.cell(row=r, column=name_col).value
        addr = data_sheet.cell(row=r, column=addr_col).value
        url = data_sheet.cell(row=r, column=url_col).value
        score = data_sheet.cell(row=r, column=score_col).value
        status = (data_sheet.cell(row=r, column=status_col).value or "").strip()
        
        if name is not None:
            total_names += 1
            if not str(name).strip():
                empty_names += 1
        
        if addr is not None:
            total_addrs += 1
            if not str(addr).strip():
                empty_addrs += 1
        
        if url is not None:
            total_urls += 1
            if not str(url).strip():
                empty_urls += 1
        
        if score:
            try:
                scores.append(int(score))
            except (ValueError, TypeError):
                pass
        
        statuses[status] = statuses.get(status, 0) + 1
    
    # Completeness metrics
    metrics = [
        ("Hotel Names", total_names, empty_names),
        ("Addresses", total_addrs, empty_addrs),
        ("URLs", total_urls, empty_urls),
    ]
    
    for label, total, empty in metrics:
        filled = total - empty
        pct = (filled / total * 100) if total > 0 else 0
        status_icon = "✅" if pct >= 90 else "⚠️" if pct >= 70 else "❌"
        
        validation.cell(row=row, column=1, value=label).font = label_font
        validation.cell(row=row, column=2, value=f"{filled}/{total}").font = value_font
        validation.cell(row=row, column=3, value=f"{pct:.1f}%").font = good_font if pct >= 90 else warning_font if pct >= 70 else error_font
        validation.cell(row=row, column=4, value=status_icon).font = value_font
        row += 1
    
    # Score Analysis
    row += 1
    validation.cell(row=row, column=1, value="Score Analysis").font = section_font
    row += 1
    
    if scores:
        avg_score = sum(scores) / len(scores)
        min_score = min(scores)
        max_score = max(scores)
        low_scores = sum(1 for s in scores if s < 50)
        
        score_metrics = [
            ("Average Score", f"{avg_score:.1f}%", good_font if avg_score >= 70 else warning_font if avg_score >= 50 else error_font),
            ("Min Score", f"{min_score}%", error_font if min_score < 50 else warning_font),
            ("Max Score", f"{max_score}%", good_font if max_score >= 80 else warning_font),
            ("Low Score Count (<50%)", str(low_scores), error_font if low_scores > 0 else good_font),
            ("Total Scored", str(len(scores)), value_font),
        ]
        
        for label, value, font in score_metrics:
            validation.cell(row=row, column=1, value=label).font = label_font
            validation.cell(row=row, column=2, value=value).font = font
            row += 1
    
    # Status Distribution
    row += 1
    validation.cell(row=row, column=1, value="Status Distribution").font = section_font
    row += 1
    
    for status, count in sorted(statuses.items(), key=lambda x: -x[1]):
        pct = (count / total_rows * 100) if total_rows > 0 else 0
        color = {"matched": "3ba55d", "no-valid-result": "faa61a", "error": "ff4d4f"}.get(status, "999")
        
        validation.cell(row=row, column=1, value=status).font = label_font
        validation.cell(row=row, column=2, value=count).font = value_font
        validation.cell(row=row, column=3, value=f"{pct:.1f}%").font = Font(color=color, bold=True)
        row += 1
    
    # Recommendations
    row += 1
    validation.cell(row=row, column=1, value="Recommendations").font = section_font
    row += 1
    
    recommendations = []
    if empty_names > 0:
        recommendations.append(f"Fix {empty_names} empty hotel names")
    if empty_addrs > 0:
        recommendations.append(f"Add addresses for {empty_addrs} hotels")
    if scores and sum(scores) / len(scores) < 60:
        recommendations.append("Low average score - consider improving search queries")
    if statuses.get("error", 0) > total_rows * 0.1:
        recommendations.append("High error rate - check input data quality")
    if statuses.get("no-valid-result", 0) > total_rows * 0.3:
        recommendations.append("Many hotels without results - verify hotel names")
    
    if not recommendations:
        recommendations.append("Data quality looks good!")
    
    for rec in recommendations:
        validation.cell(row=row, column=1, value="• " + rec).font = value_font
        row += 1
    
    # Auto-width columns
    validation.column_dimensions["A"].width = 30
    validation.column_dimensions["B"].width = 15
    validation.column_dimensions["C"].width = 15
    validation.column_dimensions["D"].width = 10


def main():
    parser = argparse.ArgumentParser(description="Tìm official website URL cho danh sách khách sạn")
    parser.add_argument("--input", required=True, help="Đường dẫn file Excel đầu vào")
    parser.add_argument("--output", default=None, help="Đường dẫn file Excel đầu ra (tự动生成 nếu bỏ trống)")
    parser.add_argument("--json", action="store_true", help="Output progress dạng JSON (dùng cho web)")
    parser.add_argument("--save-every", type=int, default=10, help="Lưu file mỗi N khách sạn (mặc định: 10)")
    parser.add_argument("--resume", default=None, help="Resume từ file output cũ (bỏ qua dòng đã có URL)")
    parser.add_argument("--workers", type=int, default=1, help="Số worker chạy song song (mặc định: 1)")
    parser.add_argument("--progress", default=None, help="Đường dẫn file progress JSON (để resume)")
    parser.add_argument("--clean-output", action="store_true", help="Tạo file output sạch chỉ chứa kết quả")
    
    # Formatting options
    parser.add_argument("--font-size", type=int, default=11, help="Font size cho data cells (mặc định: 11)")
    parser.add_argument("--header-style", choices=["default", "minimal", "bold"], default="default", 
                        help="Header style: default (colored), minimal (white), bold")
    parser.add_argument("--date-format", default="%Y-%m-%d %H:%M:%S", help="Date format cho timestamps")
    parser.add_argument("--no-autofit", action="store_true", help="Tắt auto-fit column widths")
    parser.add_argument("--template", choices=["full", "executive", "quick", "analysis"], default="full",
                        help="Export template: full (all sheets), executive (summary only), quick (results only), analysis (stats focus)")
    parser.add_argument("--zip", action="store_true", help="Compress output to ZIP file")
    parser.add_argument("--email", default=None, help="Email address for completion notification")
    parser.add_argument("--email-on-error", action="store_true", help="Send email on errors only")
    parser.add_argument("--schedule", default=None, help="Schedule export (e.g., 'daily', 'weekly', 'hourly', or cron expression)")
    parser.add_argument("--schedule-id", default=None, help="Unique ID for scheduled job")
    parser.add_argument("--webhook", default=None, help="Webhook URL for completion notification")
    parser.add_argument("--webhook-on-error", action="store_true", help="Send webhook on errors only")
    parser.add_argument("--log-file", default=None, help="Log file path (default: console only)")
    parser.add_argument("--log-level", choices=["DEBUG", "INFO", "WARNING", "ERROR"], default="INFO", help="Log level")
    parser.add_argument("--optimize-memory", action="store_true", help="Optimize memory usage for large files")
    parser.add_argument("--parallel-export", action="store_true", help="Enable parallel sheet generation")
    parser.add_argument("--streaming", action="store_true", help="Enable streaming export for large datasets")
    parser.add_argument("--compression-level", type=int, default=6, choices=range(0, 10), help="ZIP compression level (0-9)")
    
    args = parser.parse_args()

    # Validate Oxylabs credentials
    if not os.environ.get("OXYLABS_USER") or not os.environ.get("OXYLABS_PASS"):
        print("ERROR: Set OXYLABS_USER and OXYLABS_PASS environment variables", file=sys.stderr)
        sys.exit(1)

    # If resume, use the resume file as output
    output_path = args.output
    if args.resume:
        output_path = args.resume
        log(f"Resuming from: {args.resume}")

    # Store formatting options globally
    global EXPORT_FORMAT_OPTIONS
    EXPORT_FORMAT_OPTIONS = {
        "font_size": args.font_size,
        "header_style": args.header_style,
        "date_format": args.date_format,
        "autofit": not args.no_autofit,
        "template": args.template,
        "email": args.email,
        "email_on_error": args.email_on_error,
        "webhook": args.webhook,
        "webhook_on_error": args.webhook_on_error,
        "log_file": args.log_file,
        "log_level": args.log_level,
    }
    
    # Setup logging
    logger = setup_logging(args.log_file, args.log_level)
    logger.info(f"Starting export with template: {args.template}")

    output = asyncio.run(process_excel(args.input, output_path, args.json, args.save_every,
                                       resume=bool(args.resume), workers=args.workers,
                                       progress_file=args.progress, clean_output=args.clean_output))
    if not args.json:
        print(output)


# Global formatting options
EXPORT_FORMAT_OPTIONS = {
    "font_size": 11,
    "header_style": "default",
    "date_format": "%Y-%m-%d %H:%M:%S",
    "autofit": True,
    "template": "full",
    "email": None,
    "email_on_error": False,
    "webhook": None,
    "webhook_on_error": False,
    "log_file": None,
    "log_level": "INFO",
}

# Logging setup
import logging

def setup_logging(log_file=None, log_level="INFO"):
    """Setup logging configuration."""
    logger = logging.getLogger("hotel_url_finder")
    logger.setLevel(getattr(logging, log_level))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level))
    console_format = logging.Formatter("[%(asctime)s] %(message)s", datefmt="%H:%M:%S")
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # File handler if specified
    if log_file:
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)  # Log everything to file
        file_format = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    return logger


def send_webhook_notification(webhook_url, payload, max_retries=3):
    """Send webhook notification with retry logic."""
    import requests
    import time
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code in [200, 201, 202, 204]:
                log(f"Webhook sent successfully to {webhook_url}")
                return True
            else:
                log(f"Webhook failed with status {response.status_code}")
                
        except Exception as e:
            log(f"Webhook attempt {attempt + 1} failed: {e}")
            
        if attempt < max_retries - 1:
            time.sleep(2 ** attempt)  # Exponential backoff
    
    log(f"Webhook failed after {max_retries} attempts")
    return False


def send_email_notification(to_email, subject, body, attachment_path=None):
    """Send email notification (requires SMTP configuration)."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.base import MIMEBase
    from email import encoders
    
    # Check if SMTP is configured
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    
    if not smtp_user or not smtp_pass:
        log("Warning: SMTP not configured. Set SMTP_USER and SMTP_PASS environment variables.")
        return False
    
    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg["Subject"] = subject
        
        msg.attach(MIMEText(body, "html"))
        
        # Add attachment if provided
        if attachment_path and Path(attachment_path).exists():
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
            
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename={Path(attachment_path).name}")
            msg.attach(part)
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        log(f"Email notification sent to {to_email}")
        return True
        
    except Exception as e:
        log(f"Failed to send email: {e}")
        return False


def create_email_report(total, matched, no_result, errors, avg_score, processing_time, output_path):
    """Create HTML email report."""
    match_rate = (matched / total * 100) if total > 0 else 0
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1a73e8;">Hotel URL Finder - Job Complete</h2>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Hotels</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{total}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Matched</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #3ba55d;">{matched} ({match_rate:.1f}%)</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>No Result</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #faa61a;">{no_result}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Errors</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #ff4d4f;">{errors}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Average Score</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{avg_score}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px;"><strong>Processing Time</strong></td>
                    <td style="padding: 8px;">{processing_time:.1f} seconds</td>
                </tr>
            </table>
        </div>
        
        <p style="color: #666; font-size: 12px;">
            Output file: {Path(output_path).name}<br>
            Generated by Hotel URL Finder
        </p>
    </body>
    </html>
    """
    return html


def get_schedule_interval(schedule_str):
    """Convert schedule string to interval in seconds."""
    schedules = {
        "hourly": 3600,
        "daily": 86400,
        "weekly": 604800,
        "monthly": 2592000,
    }
    return schedules.get(schedule_str.lower(), None)


def save_schedule(schedule_id, config):
    """Save scheduled job configuration."""
    import json
    schedule_file = Path("schedules.json")
    
    schedules = {}
    if schedule_file.exists():
        try:
            with open(schedule_file, "r") as f:
                schedules = json.load(f)
        except Exception:
            pass
    
    schedules[schedule_id] = {
        "config": config,
        "created_at": datetime.now().isoformat(),
        "last_run": None,
        "next_run": None,
    }
    
    with open(schedule_file, "w") as f:
        json.dump(schedules, f, indent=2)
    
    log(f"Schedule saved: {schedule_id}")


def apply_export_template(workbook, template, sheet, total_valid, url_col, engine_col, score_col, img_col, status_col, workers, worker_stats):
    """Apply export template to determine which sheets to include."""
    import time
    start_time = time.time()
    
    def log_progress(step, total_steps, description):
        elapsed = time.time() - start_time
        progress = (step / total_steps) * 100
        eta = (elapsed / step * (total_steps - step)) if step > 0 else 0
        log(f"  [Export] {progress:.0f}% - {description} (ETA: {eta:.0f}s)")
    
    # Error handling wrapper
    def safe_execute(func, *args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            log(f"  [Warning] {func.__name__} failed: {e}")
            return None
    
    if template == "executive":
        # Executive: Only summary and key metrics
        log_progress(1, 2, "Generating summary sheet...")
        safe_execute(_add_summary_sheet, workbook, sheet, total_valid, url_col, engine_col, score_col, status_col, workers, worker_stats)
        log_progress(2, 2, "Executive template complete")
        
    elif template == "quick":
        # Quick: Only main results with minimal formatting
        log_progress(1, 1, "Quick template complete")
        
    elif template == "analysis":
        # Analysis: Focus on statistics and validation
        total_steps = 3
        log_progress(1, total_steps, "Generating summary sheet...")
        safe_execute(_add_summary_sheet, workbook, sheet, total_valid, url_col, engine_col, score_col, status_col, workers, worker_stats)
        
        log_progress(2, total_steps, "Generating validation report...")
        safe_execute(_add_validation_report, workbook, sheet, total_valid, 1, 2, url_col, score_col, status_col)
        
        log_progress(3, total_steps, "Applying conditional styling...")
        safe_execute(_apply_conditional_styling, sheet, total_valid, score_col, img_col, status_col)
        
    else:  # full
        # Full: All sheets (default behavior)
        total_steps = 5
        
        log_progress(1, total_steps, "Generating summary sheet...")
        safe_execute(_add_summary_sheet, workbook, sheet, total_valid, url_col, engine_col, score_col, status_col, workers, worker_stats)
        
        log_progress(2, total_steps, "Generating notes sheet...")
        safe_execute(_add_notes_sheet, workbook, sheet, total_valid, url_col, score_col, status_col, workers, worker_stats)
        
        log_progress(3, total_steps, "Generating auto-filter sheets...")
        safe_execute(_add_auto_filter_sheets, workbook, sheet, total_valid, url_col, score_col, img_col, status_col)
        
        log_progress(4, total_steps, "Generating validation report...")
        safe_execute(_add_validation_report, workbook, sheet, total_valid, 1, 2, url_col, score_col, status_col)
        
        log_progress(5, total_steps, "Applying conditional styling...")
        safe_execute(_apply_conditional_styling, sheet, total_valid, score_col, img_col, status_col)


if __name__ == "__main__":
    main()
