var QuadTree = require('./Quadtree'),
	Heap = require('heap');


function AQuickStar(opt) {
	opt = opt || {};

	this.map = opt.map;
	this.width = opt.width;
	this.height = opt.height;
	
	this.qt = new QuadTree({
    	x: 0,
    	y: 0,
    	width: this.width,
    	height: this.height
	}, 1, Number.MAX_VALUE);

	// map initial state
	for (var i = 0; i < this.width; i++)
		for (var j = 0; j < this.height; j++)
			if (this.map[i][j] == 1)
				this.qt.insert({x: i, y: j, width: 1, height: 1});


}


AQuickStar.prototype.addObstacle = function(x, y) {
	this.map[x][y] = 1;
	this.qt.insert({x: y, y: x, width: 1, height: 1});
};


AQuickStar.prototype.removeObstacle = function(x, y) {
	this.map[x][y] = 0;
	this.qt.remove({x: y, y: x, width: 1, height: 1});
};


AQuickStar.prototype.findPath = function(start, end, heuristic) {

	start = {x: start[0], y: start[1], width: 1, height: 1};
	end = {x: end[0], y: end[1], width: 1, height: 1};
	heuristic = heuristic || this.manhattanHeuristic;

	this.qt.insert(start);
	this.qt.insert(end);

	var path = this._findPath(start, end, heuristic);

	this.qt.removeObject(start);
	this.qt.removeObject(end);

	return path;
};

/*
 * Algorithm based on http://www.briangrinstead.com/blog/astar-search-algorithm-in-javascript
 */
AQuickStar.prototype._findPath = function(start, end, heuristic) {
	var sameNodeFn = function(n1, n2) {
				return n1.x === n2.x && n1.y === n2.y && n1.width === n2.width && n1.height === n2.height;
	};
	var openList = new Heap(function(x, y) { return x.f - y.f; });
	var closedList = [];

	openList.push(start);

	while(!openList.empty()) {
		currentNode = openList.pop();

		if(sameNodeFn(currentNode, end)) {
			var curr = currentNode;
			var path = [];
			while(curr.parent) {
				path.push(curr);
				curr = curr.parent;
			}
			path.push(curr);	// push first node (start)
			return path.reverse();
		}
		
		closedList.push(currentNode);
		
		var neighbors = this._getNeighbors(currentNode);
		for (var ni = 0; ni < neighbors.length; ni++) {
			var neighbor = neighbors[ni];

			var gScore = (currentNode.g || 0) + neighbor.cost;
			var neighborIsInArrayFn = function(n) { return sameNodeFn(n, neighbor);	};

			if(!closedList.find(neighborIsInArrayFn)) {
				var neighborNode = openList.toArray().find(neighborIsInArrayFn);
				if(!neighborNode) {
					neighborNode = neighbor;
					neighborNode.g = gScore;
					neighborNode.f = gScore + heuristic(end.x, end.y, 
														neighborNode.x, neighborNode.y);
					neighborNode.parent = currentNode;

					openList.push(neighborNode);
				} else if(neighborNode.g > gScore) {
					neighborNode.g = gScore;
					neighborNode.f = gScore + heuristic(end.x, end.y, 
														neighborNode.x, neighborNode.y);
					neighborNode.parent = currentNode;												
				}
			}
		}
	}
	return [];
};


AQuickStar.prototype.manhattanHeuristic = function(x1, y1, x2, y2) {
	return Math.abs(x2 - x1) + Math.abs(y2 - y1);
};


AQuickStar.prototype._getNeighbors = function(bounds) {
	var result = [];
	var neighbors = [];

	// generate all top and bottom neighbors coordinates
	for (var wi = bounds.x; wi <  bounds.x + bounds.width; wi++) {
		neighbors.push({ x: wi, y: bounds.y - 1, width: 1, height: 1 });
		neighbors.push({ x: wi, y: bounds.y + bounds.height, width: 1, height: 1 });
	}

	// generate all left and right neighbors coordinates
	for (var hi = bounds.y; hi < bounds.y + bounds.width; hi++) {
		neighbors.push({ x: bounds.x - 1, y: hi, width: 1, height: 1 });
		neighbors.push({ x: bounds.x + bounds.width, y: hi, width: 1, height: 1 });
	}

	for (var i = 0; i < neighbors.length; i++) {
		var neighbor = neighbors[i];
		
		// check if neighbor is still inside the map
		if (!(0 <= neighbor.x && neighbor.x < this.width && 0 <= neighbor.y && neighbor.y < this.height))
			continue;
		
		// check if the neighbor is actually a block
		if (this.map[neighbor.x][neighbor.y] == 1)
			continue;

		// get neighbor's information from quadtree and put it into the result array 
		result.push(this._getNeighbor(neighbor));
	}

	// eliminates duplicated elements
	result = result.filter((e1, index, self) => self.findIndex((e2) => {return e2.y === e1.y && e2.x === e1.x && e2.cost === e1.cost; }) === index);


	return result;
};


AQuickStar.prototype._getNeighbor = function(node) {

	var retrievedNeighbor = this.qt.getObjectNode(node);

	// if the node is on the lowest level or it is inside a quadrant with only one block,
	// then return it with node cost = 1
	if (retrievedNeighbor.level == Math.log2(this.width) || 
		(retrievedNeighbor.level < Math.log2(this.width) && retrievedNeighbor.objects.length)) {
		return {
			x: node.x,
			y: node.y,
			width: 1,
			height: 1,
			cost: 1
		};
	}

	// Return the group nodes otherwise
	return {
		x: retrievedNeighbor.bounds.x,
		y: retrievedNeighbor.bounds.y,
		width: retrievedNeighbor.bounds.width,
		height: retrievedNeighbor.bounds.height,
		cost: Math.sqrt(Math.pow(retrievedNeighbor.bounds.width, 2) + Math.pow(retrievedNeighbor.bounds.height, 2))
	};
};


module.exports = AQuickStar;