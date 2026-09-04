# Sony Broadcast Monitor — Companion v3 rewrite

Modern TypeScript rewrite of `bitfocus/companion-module-sony-broadcastmonitor` for the current Bitfocus Companion Module API.

## Scope

This branch preserves the legacy module's confirmed action/preset surface while replacing the old `instance_skel`/legacy TCP implementation with:

- `InstanceBase` + modern Companion definitions;
- TypeScript build output;
- reconnecting TCP transport;
- a single-flight command queue matching Sony SDCP request/response sequencing;
- framed TCP receive buffering for fragmented and coalesced packets;
- SDCP response validation and `STATret` diagnostic parsing;
- protocol unit tests.

The module intentionally does **not** add guessed BVM-HX310 function-key commands or new state feedbacks/variables.

## Development

Requires Node 22.

```sh
npm install
npm run build
npm test
npm run lint
npm run format:check
```

## Protocol notes

The packet builder retains the legacy module's SDCP frame layout:

- version `0x03`;
- category `0x0B`;
- community `SONY`;
- group ID `0`;
- monitor unit ID `1`–`99` using the legacy two-digit/BCD-like packet encoding;
- request byte `0x00`;
- item `0xB000`;
- two-byte big-endian payload length;
- ASCII VMC payload (`STATset`, `STATget`, `INFObutton`).

The monitor-ID encoding is deliberately preserved rather than reinterpreted. Hardware capture should confirm IDs above 9 before that behavior is changed.

## BVM-HX310

Issue #3 reports incorrect function-key behavior on BVM-HX310. The available discussion explicitly notes that the normal product manual does not contain the required remote-control mapping. This rewrite therefore does not invent HX310-specific commands. Useful evidence would be either:

1. an authoritative HX310/BKM-16R remote-control protocol document; or
2. an isolated, authorized packet capture of a BKM-16R controlling an HX310, with the exact physical key operation annotated.

## Safety

Do not publish production IP addresses, credentials, site names, or unredacted facility captures. Hardware validation should be performed on a bench monitor or in an approved non-production window.
