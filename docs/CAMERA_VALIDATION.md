# Camera validation protocol

The camera feature reports movement observations. It does not determine readiness, diagnose a condition, or provide medical clearance.

## Automated checks completed

- Four modes are implemented: single-leg squat, single-leg balance, hop on the spot, and single-leg bridge.
- The pose model and WebAssembly runtime are hosted by the app and execute in a Web Worker.
- Frames are capped at 10 per second, transferred as `ImageBitmap` objects, measured, and closed without upload or persistence.
- Landmark smoothing, full-body framing, rep cycles, hold duration, knee angle, squat depth, 2D FPPA offset, and side difference have unit tests.
- The Pixel-sized Playwright journey verifies that all four tests and the non-clearance statement are discoverable without horizontal overflow.

## Required physical-device exit check

Run this check before marking Tier 2 complete:

1. Open the deployed HTTPS app on one mid-range Android phone.
2. Record three short clips for each of the four movements with a clearly visible manual count or timer.
3. Run each clip through the camera flow under consistent lighting and the instructed front or side view.
4. Record the phone model, browser version, median displayed processing rate, manual count, observed count, and any dropped count.
5. Repeat any mismatch once. Describe the lighting, clothing contrast, framing, and movement range rather than changing a threshold to force agreement.
6. Confirm the browser network panel shows no image or video upload.

| Device | Browser | Test | Manual | Observed | Processing | Notes |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Pending physical check | Pending | Pending |  |  |  |  |

The implementation thresholds are counting hysteresis values, not clinical cutoffs. Any future claim about accuracy requires a defined dataset, protocol, sample size, and results.
