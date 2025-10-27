/**
 * Pathfinder module for calculating shortest paths between campus locations
 */

class PathFinder {
  constructor() {
    this.nodes = [];
    this.paths = [];
    this.graph = {};
    this.precomputedPaths = {};
    this.walkingSpeedMetersPerMinute = 65; // average walking speed of human is 60-80meter / min
    this.pixelToMeterRatio = 1.5; // Conversion ratio from pixel distance to real-world meters. sounds about right.
  }

  /**
   * Load pathway data from JSON file
   */
  async loadData() {
    try {
      const response = await fetch('data/pathways.json');
      if (!response.ok) throw new Error("Failed to load pathways data");
      
      const data = await response.json();
      this.nodes = data.nodes;
      this.paths = data.paths;
      this.buildGraph();
      this.precomputeCommonPaths();
      console.log("Pathways data loaded successfully");
      return true;
    } catch (err) {
      console.error("Error loading pathways data:", err);
      return false;
    }
  }

  /**
   * Build graph representation for pathfinding algorithm
   */
  buildGraph() {
    this.graph = {};
    
    // Initialize graph with all nodes
    this.nodes.forEach(node => {
      this.graph[node.id] = {};
    });
    
    // Add edges with distances
    this.paths.forEach(path => {
      if (path.walkable) {
        this.graph[path.start][path.end] = path.distance;
        this.graph[path.end][path.start] = path.distance; // Undirected graph
      }
    });
    
    console.log("Graph built with walkable paths");
  }

  /**
   * Precompute paths between common locations for faster retrieval
   */
  precomputeCommonPaths() {
    // Get all building and gate nodes
    const keyLocations = this.nodes.filter(node => 
      node.type === "building" || node.type === "gate"
    );
    
    // Precompute paths between all key locations
    for (let i = 0; i < keyLocations.length; i++) {
      const start = keyLocations[i];
      
      if (!this.precomputedPaths[start.id]) {
        this.precomputedPaths[start.id] = {};
      }
      
      for (let j = 0; j < keyLocations.length; j++) {
        if (i !== j) {
          const end = keyLocations[j];
          const path = this.computeShortestPath(start.id, end.id);
          
          this.precomputedPaths[start.id][end.id] = path;
        }
      }
    }
    
    console.log("Precomputed paths between key locations");
  }

  /**
   * Find the shortest path between two nodes using Dijkstra's algorithm
   * @param {string} startId - Starting node ID
   * @param {string} endId - Ending node ID
   * @returns {Object} - Path information including nodes, total distance, and coordinates
   */
  findShortestPath(startId, endId) {
    // Check if we have a precomputed path
    if (this.precomputedPaths[startId] && this.precomputedPaths[startId][endId]) {
      console.log("Using precomputed path");
      return this.precomputedPaths[startId][endId];
    }
    
    return this.computeShortestPath(startId, endId);
  }
  
  /**
   * Compute the shortest path using Dijkstra's algorithm
   * @param {string} startId - Starting node ID
   * @param {string} endId - Ending node ID
   * @returns {Object} - Path information including nodes, total distance, and coordinates
   */
  computeShortestPath(startId, endId) {
    // Initialize distances with Infinity for all nodes except start
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    
    // Initialize all nodes
    Object.keys(this.graph).forEach(node => {
      distances[node] = node === startId ? 0 : Infinity;
      previous[node] = null;
      unvisited.add(node);
    });
    
    // Main Dijkstra algorithm loop
    while (unvisited.size > 0) {
      // Find the unvisited node with the smallest distance
      let current = null;
      let smallestDistance = Infinity;
      
      for (const node of unvisited) {
        if (distances[node] < smallestDistance) {
          smallestDistance = distances[node];
          current = node;
        }
      }
      
      // If we've reached the end or there's no path
      if (current === endId || current === null || distances[current] === Infinity) {
        break;
      }
      
      // Remove current node from unvisited set
      unvisited.delete(current);
      
      // Check all neighbors of current node
      for (const neighbor in this.graph[current]) {
        if (unvisited.has(neighbor)) {
          const distance = distances[current] + this.graph[current][neighbor];
          
          // If we found a shorter path to the neighbor
          if (distance < distances[neighbor]) {
            distances[neighbor] = distance;
            previous[neighbor] = current;
          }
        }
      }
    }
    
    // Build the path from end to start
    const path = [];
    let current = endId;
    
    // If there's no path to the end
    if (previous[endId] === null && endId !== startId) {
      return {
        path: [],
        distance: Infinity,
        coordinates: [],
        estimatedTime: 0
      };
    }
    
    // Reconstruct the path
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
    
    // Get coordinates for each node in the path
    const coordinates = path.map(nodeId => {
      const node = this.nodes.find(n => n.id === nodeId);
      return { x: node.x, y: node.y, id: node.id, name: node.name };
    });
    
    // Calculate real-world distance in meters
    const realWorldDistance = distances[endId] * this.pixelToMeterRatio;
    
    // Calculate estimated walking time in minutes
    const estimatedTime = realWorldDistance / this.walkingSpeedMetersPerMinute;
    
    return {
      path,
      distance: realWorldDistance,
      coordinates,
      estimatedTime
    };
  }

  /**
   * Find the nearest node to given coordinates
   * @param {number} x - X coordinate (percentage)
   * @param {number} y - Y coordinate (percentage)
   * @param {string} nodeType - Optional filter for node type
   * @returns {string} - ID of the nearest node
   */
  findNearestNode(x, y, nodeType = null) {
    let nearestNode = null;
    let minDistance = Infinity;
    
    this.nodes.forEach(node => {
      // Skip if nodeType is specified and doesn't match
      if (nodeType && node.type !== nodeType) return;
      
      const distance = Math.sqrt(
        Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node.id;
      }
    });
    
    return nearestNode;
  }

  /**
   * Get node by ID
   * @param {string} id - Node ID
   * @returns {Object|null} - Node object or null if not found
   */
  getNode(id) {
    return this.nodes.find(node => node.id === id) || null;
  }
  
  /**
   * Get all nodes of a specific type
   * @param {string} type - Node type to filter by
   * @returns {Array} - Array of nodes matching the type
   */
  getNodesByType(type) {
    return this.nodes.filter(node => node.type === type);
  }
  
  /**
   * Calculate the pixel distance between two points
   * @param {Object} point1 - First point with x, y coordinates
   * @param {Object} point2 - Second point with x, y coordinates
   * @returns {number} - Euclidean distance between points
   */
  calculateDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + 
      Math.pow(point2.y - point1.y, 2)
    );
  }
  
  /**
   * Convert pixel distance to real-world meters
   * @param {number} pixelDistance - Distance in pixels
   * @returns {number} - Distance in meters
   */
  pixelsToMeters(pixelDistance) {
    return pixelDistance * this.pixelToMeterRatio;
  }
  
  /**
   * Calculate estimated walking time between two points
   * @param {number} distanceInMeters - Distance in meters
   * @returns {number} - Time in minutes
   */
  calculateWalkingTime(distanceInMeters) {
    return distanceInMeters / this.walkingSpeedMetersPerMinute;
  }
}

// Export the PathFinder class
window.PathFinder = PathFinder;