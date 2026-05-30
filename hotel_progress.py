"""Progress persistence for hotel URL finder - enables resume from any point."""

import json
from datetime import datetime
from pathlib import Path


class ProgressTracker:
    """Tracks and persists processing progress for resume capability."""

    def __init__(self, progress_path: str):
        self.path = Path(progress_path)
        self.data = {
            "version": 1,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "input_file": "",
            "output_file": "",
            "total_rows": 0,
            "processed_rows": 0,
            "completed_rows": [],  # List of row numbers that are done
            "worker_stats": {},
            "status": "running",  # running, completed, interrupted
            "last_error": None,
        }
        self._load()

    def _load(self):
        """Load existing progress if available."""
        if self.path.exists():
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                if saved.get("version") == 1:
                    self.data.update(saved)
            except (json.JSONDecodeError, KeyError):
                pass  # Start fresh if corrupted

    def save(self):
        """Persist current progress to disk."""
        self.data["updated_at"] = datetime.now().isoformat()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        tmp.replace(self.path)

    def set_input_output(self, input_file: str, output_file: str, total_rows: int):
        """Set input/output file info."""
        self.data["input_file"] = input_file
        self.data["output_file"] = output_file
        self.data["total_rows"] = total_rows
        self.save()

    def mark_row_done(self, row_number: int):
        """Mark a row as completed."""
        if row_number not in self.data["completed_rows"]:
            self.data["completed_rows"].append(row_number)
            self.data["processed_rows"] = len(self.data["completed_rows"])
            self.save()

    def update_worker_stats(self, worker_id: int, processed: int, errors: int):
        """Update stats for a specific worker."""
        self.data["worker_stats"][str(worker_id)] = {
            "processed": processed,
            "errors": errors,
        }
        self.save()

    def mark_completed(self):
        """Mark the entire job as completed."""
        self.data["status"] = "completed"
        self.save()

    def mark_interrupted(self, error: str = None):
        """Mark the job as interrupted."""
        self.data["status"] = "interrupted"
        self.data["last_error"] = error
        self.save()

    def get_completed_rows(self) -> set:
        """Get set of completed row numbers."""
        return set(self.data["completed_rows"])

    def get_progress_summary(self) -> dict:
        """Get a summary of current progress."""
        return {
            "total": self.data["total_rows"],
            "processed": self.data["processed_rows"],
            "remaining": self.data["total_rows"] - self.data["processed_rows"],
            "status": self.data["status"],
            "created_at": self.data["created_at"],
            "updated_at": self.data["updated_at"],
        }

    @staticmethod
    def cleanup(progress_path: str):
        """Remove a progress file (call after successful completion)."""
        p = Path(progress_path)
        if p.exists():
            p.unlink()
