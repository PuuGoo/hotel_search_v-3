import requests, time

with open("test_long.xlsx", "rb") as f:
    files = {"file": ("test_long.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post("http://localhost:3020/api/hotel-finder", files=files,
                      data={"workers": "1", "template": "quick"}, timeout=60)
print("UPLOAD:", r.status_code, r.text[:200])
job = r.json()["job_id"]
# wait a few seconds so the job is actively running (1 worker, 6 hotels)
time.sleep(8)
rc = requests.post(f"http://localhost:3020/api/hotel-finder/cancel/{job}", timeout=30)
print("CANCEL:", rc.status_code, rc.text[:200])
time.sleep(2)
rj = requests.get("http://localhost:3020/api/hotel-finder", timeout=10)
this = [j for j in rj.json()["jobs"] if j["id"] == job]
print("JOB STATUS:", this[0]["status"] if this else "gone", "processed:", this[0]["processed"] if this else "-")
