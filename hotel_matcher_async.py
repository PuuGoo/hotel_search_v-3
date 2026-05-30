"""Hotel URL matching — search + evaluate + pick best URL (async version)."""

import asyncio
import re
from datetime import datetime
from urllib.parse import quote_plus

from hotel_url_finder import is_exact_name_match, address_match_percentage, extract_ddg_url
from hotel_gallery_async import extract_gallery_images
from web_unblocker import fetch_page_via_unblocker, parse_page_text, count_images
from stealth_enhancer import humanize_before_search
from hotel_cache import suggest_query_format


def log(msg: str):
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)
    except (UnicodeEncodeError, UnicodeDecodeError):
        try:
            safe_msg = msg.encode('ascii', errors='replace').decode('ascii')
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {safe_msg}", flush=True)
        except Exception:
            pass


def extract_location_for_search(address: str) -> str:
    """Extract key location info from address for search query.
    Returns city/state/country, skipping detailed street info."""
    if not address:
        return ""

    # Try to extract city, state, country from structured address
    parts = []

    # Look for City/Town/Village
    city_match = re.search(r'City[/\s]*Town[/\s]*Village:\s*([^,]+)', address, re.IGNORECASE)
    if city_match:
        parts.append(city_match.group(1).strip())

    # Look for State
    state_match = re.search(r'State:\s*([^,]+)', address, re.IGNORECASE)
    if state_match:
        parts.append(state_match.group(1).strip())

    # Look for District
    district_match = re.search(r'District:\s*([^,]+)', address, re.IGNORECASE)
    if district_match and not city_match:
        parts.append(district_match.group(1).strip())

    if parts:
        return " ".join(parts)

    # Fallback: use last 2-3 meaningful parts of the address
    addr_parts = [p.strip() for p in address.split(",") if p.strip()]
    if len(addr_parts) >= 2:
        return " ".join(addr_parts[-2:])

    # For addresses without commas, extract only city-like keywords
    # Skip if address is too long (likely includes hotel name or street details)
    words = address.split()
    if len(words) > 6:
        # Look for common city/location patterns
        city_patterns = [
            r'\b(Dubai|Abu Dhabi|Sharjah)\b',
            r'\b(New York|Los Angeles|San Francisco|Chicago|Miami)\b',
            r'\b(London|Paris|Berlin|Tokyo|Bangkok|Singapore)\b',
            r'\b(Mumbai|Delhi|Bangalore|Chennai|Hyderabad|Kolkata)\b',
        ]
        for pattern in city_patterns:
            match = re.search(pattern, address, re.IGNORECASE)
            if match:
                return match.group(1)
        # If no city found, return empty to use just hotel name
        return ""

    return address


async def ddg_search_with_captcha_solve(page, query: str) -> list[dict]:
    """Search DuckDuckGo using Playwright with AI CAPTCHA solving."""
    from captcha_solver import handle_captcha

    encoded_query = quote_plus(query)
    await page.goto(f"https://duckduckgo.com/?q={encoded_query}", wait_until="domcontentloaded", timeout=20000)
    await humanize_before_search(page)
    await page.wait_for_timeout(2000)

    # Check for and solve CAPTCHA
    captcha_solved = await handle_captcha(page, provider="openai")
    if not captcha_solved:
        log("  CAPTCHA could not be solved")
        return []

    await page.wait_for_timeout(1000)

    results = []
    for selector in [
        "article[data-testid='result'] a[data-testid='result-title-a']",
        "a[data-testid='result-title-a']",
        "h2 a",
        ".result__a",
    ]:
        links = page.locator(selector)
        count = await links.count()
        if count > 0:
            log(f"Found {count} results with selector: {selector}")
            for i in range(min(count, 10)):
                link = links.nth(i)
                href = await link.get_attribute("href") or ""
                title = (await link.text_content() or "").strip()
                if href and title:
                    href = extract_ddg_url(href)
                    results.append({"url": href, "title": title})
            break
    return results


async def ddg_search(page, query: str) -> list[dict]:
    """Search DuckDuckGo using Playwright with AI CAPTCHA solver."""
    # Web Unblocker disabled - using AI CAPTCHA Solver directly
    return await ddg_search_with_captcha_solve(page, query)


async def pick_url_for_hotel(page, hotel_name: str, hotel_address: str) -> tuple:
    """Search, evaluate, and pick the best URL for a hotel.

    Returns: (url, engine, score, img_count, status)
    """
    # Always extract location (used later for fallback strategies)
    location = extract_location_for_search(hotel_address)

    # Use smart query optimization based on cache patterns
    try:
        optimized_query = suggest_query_format(hotel_name, hotel_address)
    except Exception:
        # Fallback to standard query
        optimized_query = f"{hotel_name} {location}".strip()

    query = optimized_query
    log(f"Searching: {query}")

    addr_threshold = 50

    async def evaluate_results(results, engine):
        log(f"  [{engine}] {len(results)} results found")
        matches = []

        # Pre-filter by name match to avoid unnecessary page loads
        valid_results = [(i, r) for i, r in enumerate(results) if is_exact_name_match(hotel_name, r["title"])]
        if len(valid_results) < len(results):
            log(f"  [{engine}] Pre-filtered: {len(valid_results)}/{len(results)} name matches")

        for i, r in valid_results[:5]:  # Limit to top 5 matches
            log(f"  [{engine}] #{i+1} Fetching: {r['url']}")
            try:
                detail = await page.context.new_page()
                await detail.goto(r["url"], wait_until="domcontentloaded", timeout=20000)
                # Reduced wait times
                await detail.wait_for_timeout(1000)
                try:
                    await detail.keyboard.press("Escape")
                    await detail.wait_for_timeout(300)
                except:
                    pass
                text = await detail.inner_text("body")
                score = address_match_percentage(hotel_address, text)
                img_count = await extract_gallery_images(detail, hotel_name)
                await detail.close()
            except Exception as e:
                log(f"  [{engine}] #{i+1} Fetch failed: {e}")
                continue

            log(f"  [{engine}] #{i+1} title=OK addr={score}% imgs={img_count} url={r['url']}")
            if score >= addr_threshold:
                matches.append((r["url"], engine, score, img_count, "matched"))
            else:
                log(f"  [{engine}] #{i+1} SKIP addr below {addr_threshold}%")
        return matches

    all_matches = []

    try:
        d_results = await ddg_search(page, query)
    except Exception:
        d_results = []
    if d_results:
        all_matches.extend(await evaluate_results(d_results, "duckduckgo"))

    # Fallback strategies
    fallback_queries = []

    # Strategy 1: Just hotel name (no location)
    if location:
        fallback_queries.append(hotel_name)

    # Strategy 2: Hotel name + "official website"
    fallback_queries.append(f"{hotel_name} official website")

    # Strategy 3: Hotel name + "hotel" (if not already in name)
    if "hotel" not in hotel_name.lower():
        fallback_queries.append(f"{hotel_name} hotel")

    for fallback_query in fallback_queries:
        if all_matches:
            break
        log(f"  Retrying with: {fallback_query}")
        try:
            d_results = await ddg_search(page, fallback_query)
        except Exception:
            d_results = []
        if d_results:
            all_matches.extend(await evaluate_results(d_results, "duckduckgo"))

    if all_matches:
        best = max(all_matches, key=lambda m: m[3])
        log(f"  >>> BEST: imgs={best[3]} addr={best[2]}% engine={best[1]} url={best[0]}")
        
        # Generate auto-fix suggestions for low scores
        url, engine, score, img_count, status = best
        suggestions = []
        
        if score < 70:
            suggestions.append("Try adding city/country to search query")
            suggestions.append("Check if hotel name has alternative spellings")
        if score < 50:
            suggestions.append("Verify hotel is listed on major travel sites")
            suggestions.append("Consider searching for hotel chain + location")
        if img_count < 3:
            suggestions.append("Website may have limited image gallery")
        
        # Add suggestions to result if available
        if suggestions:
            log(f"  >>> Suggestions: {'; '.join(suggestions[:2])}")
        
        return best

    log(f"  >>> No match found")
    return "", "", 0, 0, "no-valid-result"


def get_match_explanation(score: int, img_count: int) -> str:
    """Generate human-readable explanation of match confidence."""
    if score >= 90:
        return "Excellent match - address confirmed on website"
    elif score >= 70:
        return "Good match - address partially matches"
    elif score >= 50:
        return "Fair match - location may differ slightly"
    else:
        return "Low match - verify URL manually"


def get_improvement_tips(hotel_name: str, hotel_address: str, score: int) -> list[str]:
    """Generate tips to improve search results."""
    tips = []
    
    if score < 50:
        if not hotel_address or len(hotel_address.strip()) < 10:
            tips.append("Add full address with city and country for better matching")
        
        # Check for common naming issues
        name_lower = hotel_name.lower()
        if "hotel" not in name_lower and "resort" not in name_lower and "inn" not in name_lower:
            tips.append("Include 'hotel' or 'resort' in search query")
        
        # Check for abbreviations
        if any(abbr in name_lower for abbr in ["st.", "ave.", "rd.", "blvd."]):
            tips.append("Try spelling out abbreviations (Street, Avenue, etc.)")
        
        # Location-based tips
        if "," in hotel_address:
            parts = [p.strip() for p in hotel_address.split(",")]
            if len(parts) >= 2:
                tips.append(f"Focus search on: {parts[-1].strip()}")
    
    return tips[:3]  # Return max 3 tips
