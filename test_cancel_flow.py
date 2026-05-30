import requests, time

with open("test_cancel.xlsx", "rb") as f:
    files = {"file": ("test_cancel.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post("http://localhost:3020/api/hotel-finder", files=files,
                      data={"workers": "1", "template": "quick"}, timeout=60)
print("UPLOAD status:", r.status_code)
print("UPLOAD body:", r.text[:500])

if r.status_code == 200 and r.text.strip().startswith("{"):
    job = r.json()["job_id"]
    print("job:", job)
    time.sleep(6)
    rc = requests.post(f"http://localhost:3020/api/hotel-finder/cancel/{job}", timeout=30)
    print("CANCEL:", rc.status_code, rc.text[:300])
    time.sleep(2)
    rj = requests.get("http://localhost:3020/api/hotel-finder", timeout=10)
    this = [j for j in rj.json()["jobs"] if j["id"] == job]
    print("JOB STATUS:", this[0]["status"] if this else "gone")
