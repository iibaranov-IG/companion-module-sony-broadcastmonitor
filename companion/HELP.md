# Sony Professional Video Monitor

This module controls Sony professional broadcast/video monitors using Sony's SDCP/VMC network-control protocol over TCP.

## Configuration

- **Device IP** — monitor IP address.
- **Device Port** — defaults to TCP `53484`, the SDCP port used by the legacy module and Sony network-control documentation.
- **Monitor ID** — unit ID `1`–`99`.
- **Show actions applicable to** — filters the preserved legacy action set for BVM-E, BVM-X, PVM-X, PVM-A, or LMD-A families.

## Connection behaviour

Sony's protocol requires request/response lock-step: the controller must wait for a response before issuing the next command. The rewritten transport therefore keeps only one command in flight, queues subsequent actions, handles TCP fragmentation, and reconnects after network errors.

An in-flight command is **not automatically replayed** after an uncertain disconnect. This is deliberate: replaying a `TOGGLE` command could reverse a state if the monitor acted before the connection failed.

## Actions and presets

The rewrite preserves the existing module's action IDs and VMC command construction (`STATset`, `STATget`, and `INFObutton`). The existing menu/numeric button presets are retained.

Status requests are decoded and written to the Companion connection log for diagnostics. No device-state feedbacks or variables are exposed yet because the legacy module did not establish reliable response semantics for them.

## BVM-HX310

No HX310-specific function-key commands are added by this rewrite. Issue #3 reports that the current mapping is incomplete, and the available product manual was not sufficient to confirm the remote-control command mapping. A protocol document or a safe capture from a working BKM-16R/HX310 setup is required before adding those commands.

## Troubleshooting

Enable the connection debug log and check for:

- TCP connect/disconnect messages;
- SDCP `OK`/`NG` diagnostics;
- response timeouts;
- decoded `STATret` status replies.

For hardware captures, redact IP addresses and site-specific configuration before sharing logs publicly.
