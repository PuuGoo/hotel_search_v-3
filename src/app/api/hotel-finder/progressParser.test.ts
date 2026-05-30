import { describe, it, expect } from "vitest";

import {
  splitStdoutLines,
  applyProgressLine,
  processStdoutChunk,
  type JobProgressState,
} from "./progressParser";

function freshState(): JobProgressState {
  return { total: 0, rows: [], workerStatus: {}, output: null, status: "running" };
}

describe("splitStdoutLines", () => {
  it("returns complete lines and an empty remainder when chunk ends with newline", () => {
    const { lines, remainder } = splitStdoutLines("", "a\nb\n");
    expect(lines).toEqual(["a", "b"]);
    expect(remainder).toBe("");
  });

  it("carries a trailing partial line as remainder", () => {
    const { lines, remainder } = splitStdoutLines("", "a\nb");
    expect(lines).toEqual(["a"]);
    expect(remainder).toBe("b");
  });

  it("prepends the previous buffer to the new chunk", () => {
    const { lines, remainder } = splitStdoutLines("par", "tial\nrest");
    expect(lines).toEqual(["partial"]);
    expect(remainder).toBe("rest");
  });
});

describe("applyProgressLine", () => {
  it("sets total on a start message", () => {
    const s = freshState();
    applyProgressLine(s, JSON.stringify({ type: "start", total: 42 }));
    expect(s.total).toBe(42);
  });

  it("defaults total to 0 on a start message without a total field", () => {
    const s = freshState();
    applyProgressLine(s, JSON.stringify({ type: "start" }));
    expect(s.total).toBe(0);
  });

  it("appends row messages", () => {
    const s = freshState();
    applyProgressLine(s, JSON.stringify({ type: "row", no: "1", url: "x" }));
    applyProgressLine(s, JSON.stringify({ type: "row", no: "2", url: "y" }));
    expect(s.rows).toHaveLength(2);
    expect(s.rows[1].no).toBe("2");
  });

  it("indexes worker_status by worker_id", () => {
    const s = freshState();
    applyProgressLine(s, JSON.stringify({ type: "worker_status", worker_id: 3, status: "busy" }));
    expect(s.workerStatus[3].status).toBe("busy");
  });

  it("marks done and captures output", () => {
    const s = freshState();
    applyProgressLine(s, JSON.stringify({ type: "done", output: "/tmp/out.xlsx" }));
    expect(s.status).toBe("done");
    expect(s.output).toBe("/tmp/out.xlsx");
  });

  it("marks done with null output when the output field is absent", () => {
    const s = freshState();
    applyProgressLine(s, JSON.stringify({ type: "done" }));
    expect(s.status).toBe("done");
    expect(s.output).toBeNull();
  });

  it("ignores blank lines, malformed JSON and unknown types", () => {
    const s = freshState();
    applyProgressLine(s, "");
    applyProgressLine(s, "   ");
    applyProgressLine(s, "{not json");
    applyProgressLine(s, JSON.stringify({ type: "heartbeat" }));
    applyProgressLine(s, JSON.stringify("a string"));
    expect(s).toEqual(freshState());
  });

  it("does not index worker_status when worker_id is missing", () => {
    const s = freshState();
    applyProgressLine(s, JSON.stringify({ type: "worker_status", status: "busy" }));
    expect(Object.keys(s.workerStatus)).toHaveLength(0);
  });
});

describe("processStdoutChunk", () => {
  it("applies complete lines and returns the trailing partial line", () => {
    const s = freshState();
    const remainder = processStdoutChunk(
      s,
      "",
      JSON.stringify({ type: "start", total: 2 }) + "\n" + '{"type":"ro'
    );
    expect(s.total).toBe(2);
    expect(remainder).toBe('{"type":"ro');
  });

  it("reassembles a JSON message split across two chunks", () => {
    const s = freshState();
    const row = JSON.stringify({ type: "row", no: "1" });
    const mid = Math.floor(row.length / 2);
    let buffer = "";
    buffer = processStdoutChunk(s, buffer, row.slice(0, mid));
    expect(s.rows).toHaveLength(0); // incomplete, nothing applied yet
    buffer = processStdoutChunk(s, buffer, row.slice(mid) + "\n");
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].no).toBe("1");
    expect(buffer).toBe("");
  });

  it("handles multiple messages in a single chunk", () => {
    const s = freshState();
    const chunk =
      JSON.stringify({ type: "start", total: 3 }) +
      "\n" +
      JSON.stringify({ type: "row", no: "1" }) +
      "\n" +
      JSON.stringify({ type: "row", no: "2" }) +
      "\n";
    const remainder = processStdoutChunk(s, "", chunk);
    expect(s.total).toBe(3);
    expect(s.rows).toHaveLength(2);
    expect(remainder).toBe("");
  });
});
