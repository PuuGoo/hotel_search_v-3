import requests, json, time, sys

workers = sys.argv[1] if len(sys.argv) > 1 else "2"
template = sys.argv[2] if len(sys.argv) > 2 else "full"
infile = sys.argv[3] if len(sys.argv) > 3 else "test3.xlsx"

with open(infile, "rb") as f:
    files = {"file": (infile, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post("http://localhost:3020/api/hotel-finder", files=files,
                      data={"workers": workers, "template": template}, timeout=30)
print("UPLOAD:", r.status_code, r.text)
if r.status_code != 200:
    sys.exit(1)

job = r.json()["job_id"]
time.sleep(1)

r2 = requests.get(f"http://localhost:3020/api/hotel-finder/progress?jobId={job}",
                  stream=True, timeout=300)
rows = 0
for line in r2.iter_lines():
    if not line:
        continue
    s = line.decode("utf-8")
    if not s.startswith("data: "):
        continue
    d = json.loads(s[6:])
    t = d.get("type")
    if t == "row":
        rows += 1
        data = d["data"]
        print(f"ROW {rows}: {data.get('hotel_name')} -> {data.get('status')} "
              f"score={data.get('score')}% imgs={data.get('img_count')} url={data.get('url')}")
    elif t == "complete":
        print(f"COMPLETE processed={d.get('processed')}/{d.get('total')} jobid={job}")
        break
    elif t == "error":
        print("ERROR:", d)
        break
