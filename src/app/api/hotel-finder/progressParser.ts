// Pure stdout-processing helpers for the hotel-finder job, extracted from the
// route's spawn callback so the line-buffering and message-application logic can
// be unit-tested without spawning Python.
//
// The Python CLI emits newline-delimited JSON ("ndjson") on stdout. Chunks from
// the child process do not align to line boundaries, so a partial line at the
// end of one chunk must be carried over and prepended to the next.

// The mutable slice of a Job that stdout messages update. Keeping this narrow
// (rather than importing the full Job) makes the helper trivially testable and
// decoupled from the child-process plumbing.
export interface JobProgressState {
  total: number;
  rows: any[];
  workerStatus: Record<string, any>;
  output: string | null;
  status: string;
}

// Split an accumulated buffer + new chunk into complete lines plus the trailing
// remainder (an incomplete line, if any). The remainder must be fed back in with
// the next chunk.
export function splitStdoutLines(
  buffer: string,
  chunk: string
): { lines: string[]; remainder: string } {
  const combined = buffer + chunk;
  const parts = combined.split("\n");
  const remainder = parts.pop() ?? "";
  return { lines: parts, remainder };
}

// Apply a single parsed ndjson message to the job state. Unknown/blank lines and
// malformed JSON are ignored (the Python process may interleave non-JSON output).
export function applyProgressLine(state: JobProgressState, line: string): void {
  if (!line.trim()) return;
  let data: any;
  try {
    data = JSON.parse(line);
  } catch {
    return;
  }
  if (!data || typeof data !== "object") return;

  switch (data.type) {
    case "start":
      state.total = data.total || 0;
      break;
    case "row":
      state.rows.push(data);
      break;
    case "worker_status":
      if (data.worker_id !== undefined && data.worker_id !== null) {
        state.workerStatus[data.worker_id] = data;
      }
      break;
    case "done":
      state.status = "done";
      state.output = data.output ?? null;
      break;
    default:
      // Unknown message type: ignore so a forward-compatible CLI doesn't break.
      break;
  }
}

// Process a raw stdout chunk against a job state and its carry-over buffer.
// Returns the new buffer (trailing partial line) to retain for the next chunk.
export function processStdoutChunk(
  state: JobProgressState,
  buffer: string,
  chunk: string
): string {
  const { lines, remainder } = splitStdoutLines(buffer, chunk);
  for (const line of lines) {
    applyProgressLine(state, line);
  }
  return remainder;
}
