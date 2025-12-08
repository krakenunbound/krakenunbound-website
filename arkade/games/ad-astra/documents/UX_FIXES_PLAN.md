# Critical UX Fixes - Implementation Plan

## Issues Identified (Priority Order)

### 1. **CRITICAL: Replace Alert Boxes with Styled Modals** 🔴
- **Problem**: Using browser `alert()` which shows "localhost:8000" and looks ugly
- **Files**: `ui.js`, `main.js`
- **Solution**: Create proper CSS-styled modal system matching game theme

### 2. **CRITICAL: Genesis Torpedo Cost Balance** 🔴
- **Problem**: Costs 10k when players start with 10k (100% of starting capital)
- **Status**: ✅ FIXED - Increased to 50,000 credits (5x starting capital)

### 3. **HIGH: Active Menu Button Highlighting** 🟡
- **Problem**: No visual indication of which screen/menu is active
- **Solution**: Add `.active` class styling to top bar buttons

### 4. **HIGH: Galaxy Map Auto-Center** 🟡
- **Problem**: Doesn't center on player location or update when warping
- **Solution**: Auto-center on current sector and update on warp

### 5. **HIGH: Fuel Indicator Missing** 🟡
- **Problem**: No visible fuel gauge in main UI
- **Solution**: Add fuel display to top bar or ship stats

### 6. **MEDIUM: Asteroid Field Mining** 🟢
- **Problem**: Clickable but does nothing, no instructions
- **Solution**: Add mining mechanic or disable/explain

### 7. **MEDIUM: Stuck in Empty Space** 🟢
- **Problem**: Can get stuck with no warp lanes
- **Solution**: Add "Distress Beacon" emergency rescue option

### 8. **MEDIUM: Help System** 🟢
- **Problem**: No help/tutorial for features
- **Solution**: Add help button with tooltips and guides

## Implementation Order

1. Fix modals (affects everything)
2. Fix galaxy map centering
3. Add menu button highlighting  
4. Add fuel indicator
5. Add distress beacon
6. Add help system
7. Fix/add mining mechanic

## Next Steps

Implement these fixes incrementally and test each one.
