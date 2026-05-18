# Harden Fingerprint Access

- Reused the shared image-data channel accessor in fingerprint generation.
- Guarded histogram, queue, and fingerprint-cell reads for stricter indexed access.
