# Harden Shape Mask Access

- Reused the shared image-data channel accessor in shape-mask processing.
- Guarded queue reads and parsed background color channels for stricter indexed access.
