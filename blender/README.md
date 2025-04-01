# GLB Models Directory

This directory is used to store GLB models for the NFT gallery project.

## Current Models

### fish1.glb
- **Usage**: Swimming fish model for the underwater environment in Room A (Undersea Observatory)
- **Implementation**: Rapidly circumnavigates the dome from the outside with dynamic swimming animation
- **Expected Size**: ~2-10MB depending on complexity

## How to Add Your fish1.glb Model

1. Place your `fish1.glb` file directly in this folder.
2. Make sure the file is named exactly `fish1.glb` (case sensitive).
3. No need to modify any code - the model will be automatically loaded when you visit Room A.

## Model Requirements

- Format must be GLB (binary glTF).
- If your model is in another format, you can convert it using Blender or online converters.
- Recommended poly count: <100k for optimal performance.
- Textures should be embedded in the GLB file.

## Troubleshooting

If the model doesn't appear:
1. Check that the filename is exactly `fish1.glb`.
2. Check the browser console for any loading errors.
3. Make sure the model isn't too large (file size should ideally be under 10MB).
4. Try a different web browser if issues persist.

## Additional Information

The model will automatically be:
- Scaled to size 4.0 (larger for visibility)
- Positioned outside the dome at 1.5x the dome radius
- Animated to rapidly swim around the dome with dynamic up/down motion
- Given a slight blue tint for underwater effect
- Banking into turns for more realistic movement

You can modify these settings in `roomA.js` if needed. 