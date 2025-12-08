// ============================================================================
// KRAKEN ARKADE - SHARED COLLISION MODULE
// Circle/Rect collision detection utilities
// ============================================================================

const Collision = {
    
    // ==================== BASIC COLLISION CHECKS ====================
    
    // Circle vs Circle
    circleCircle(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const radiusSum = r1 + r2;
        return distSq < radiusSum * radiusSum;
    },
    
    // Point vs Circle
    pointCircle(px, py, cx, cy, r) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy < r * r;
    },
    
    // Rect vs Rect (AABB)
    rectRect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 &&
               x1 + w1 > x2 &&
               y1 < y2 + h2 &&
               y1 + h1 > y2;
    },
    
    // Point vs Rect
    pointRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw &&
               py >= ry && py <= ry + rh;
    },
    
    // Circle vs Rect
    circleRect(cx, cy, r, rx, ry, rw, rh) {
        // Find closest point on rect to circle center
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));
        
        const dx = cx - closestX;
        const dy = cy - closestY;
        
        return dx * dx + dy * dy < r * r;
    },
    
    // ==================== ENTITY COLLISION ====================
    
    // Check two entities with bounding circles
    entities(e1, e2) {
        const r1 = e1.radius || Math.max(e1.width || 0, e1.height || 0) / 2;
        const r2 = e2.radius || Math.max(e2.width || 0, e2.height || 0) / 2;
        return this.circleCircle(e1.x, e1.y, r1, e2.x, e2.y, r2);
    },
    
    // Check entity vs point (bullet hit detection)
    entityPoint(entity, px, py) {
        const r = entity.radius || Math.max(entity.width || 0, entity.height || 0) / 2;
        return this.pointCircle(px, py, entity.x, entity.y, r);
    },
    
    // ==================== DISTANCE UTILITIES ====================
    
    // Distance between two points
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    // Distance squared (faster, use for comparisons)
    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },
    
    // Angle from point 1 to point 2
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },
    
    // ==================== BOUNDS CHECKING ====================
    
    // Check if point is within canvas bounds
    inBounds(x, y, width, height, margin = 0) {
        return x >= -margin && x <= width + margin &&
               y >= -margin && y <= height + margin;
    },
    
    // Check if entity is off screen
    isOffScreen(entity, width, height, margin = 50) {
        return entity.x < -margin || entity.x > width + margin ||
               entity.y < -margin || entity.y > height + margin;
    },
    
    // Clamp position within bounds
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    // Clamp entity position within bounds
    clampEntity(entity, minX, maxX, minY, maxY) {
        entity.x = this.clamp(entity.x, minX, maxX);
        entity.y = this.clamp(entity.y, minY, maxY);
    },
    
    // ==================== LINE COLLISION ====================
    
    // Line vs Circle
    lineCircle(x1, y1, x2, y2, cx, cy, r) {
        // Vector from line start to circle center
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;
        
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;
        
        let discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return false;
        
        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);
        
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    },
    
    // ==================== BATCH COLLISION ====================
    
    // Check one entity against array of entities
    // Returns array of colliding entities
    checkAgainstArray(entity, array, skipDead = true) {
        const collisions = [];
        for (const other of array) {
            if (skipDead && other.dead) continue;
            if (this.entities(entity, other)) {
                collisions.push(other);
            }
        }
        return collisions;
    },
    
    // Check all pairs in array (for entity-entity collision)
    // Callback receives (entityA, entityB)
    checkAllPairs(array, callback, skipDead = true) {
        for (let i = 0; i < array.length; i++) {
            if (skipDead && array[i].dead) continue;
            for (let j = i + 1; j < array.length; j++) {
                if (skipDead && array[j].dead) continue;
                if (this.entities(array[i], array[j])) {
                    callback(array[i], array[j]);
                }
            }
        }
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Collision;
}
