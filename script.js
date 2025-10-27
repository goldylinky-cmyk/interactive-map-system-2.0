// Convert node coordinates to canvas coordinates
function toCanvasCoords(coord, canvas) {
    // Scale coordinates to match the pathways editor
    const nodeScaleX = 1.25;   // >1 stretches wider, <1 shrinks horizontally
    const nodeScaleY = 1.25;   // >1 stretches taller, <1 shrinks vertically
    const nodeOffsetX = -5.5;   // horizontal shift (in % of container width)
    const nodeOffsetY = -5.5;   // vertical shift (in % of container height)

    return {
        x: coord.x / 100 * canvas.width,
        y: coord.y / 100 * canvas.height
    };
}

// === MAIN ===
window.onload = () => {
    console.log("Campus map loaded.");
    const mapContainer = document.getElementById("map-container");
    
    // Header toggle functionality
    const toggleHeaderBtn = document.getElementById('toggle-header');
    const header = document.getElementById('main-header');
    
    toggleHeaderBtn.addEventListener('click', () => {
        header.classList.toggle('hidden');
        toggleHeaderBtn.textContent = header.classList.contains('hidden') ? 'Show Header' : 'Hide Header';
    });

     // Place icons with hover tooltips and touch-friendly behavior
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

iconData.forEach(icon => {
    const el = document.createElement("img");
    el.src = icon.img || "assets/icons/default.png";
    el.className = "map-icon";
    el.style.left = `${icon.x}%`;
    el.style.top = `${icon.y}%`;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", icon.name || "Map icon");

    // create tooltip element (shared per icon)
    const tooltip = document.createElement("div");
    tooltip.className = "map-tooltip";
    tooltip.textContent = icon.name || "";
    mapContainer.appendChild(tooltip);

    // helper: position tooltip centered above the icon, keep inside map container
    function positionTooltip() {
        const mapRect = mapContainer.getBoundingClientRect();
        const iconRect = el.getBoundingClientRect();

        // compute center x relative to mapContainer
        const centerX = (iconRect.left + iconRect.width / 2) - mapRect.left;
        const topY = (iconRect.top) - mapRect.top; // top of icon relative to map

        // apply position — tooltip uses translate(-50%, -120%) to center horizontally
        tooltip.style.left = `${centerX}px`;
        // place tooltip a little above the icon rect (use iconRect.height)
        tooltip.style.top = `${topY}px`;

        // ensure tooltip doesn't overflow left/right of container
        const tipRect = tooltip.getBoundingClientRect();
        const overflowLeft = tipRect.left < mapRect.left;
        const overflowRight = tipRect.right > mapRect.right;
        if (overflowLeft) {
            tooltip.style.left = `${Math.max(8, centerX - (tipRect.left - mapRect.left))}px`;
        } else if (overflowRight) {
            tooltip.style.left = `${Math.min(mapRect.width - 8, centerX - (tipRect.right - mapRect.right))}px`;
        }
    }

    // show / hide helpers
    function showTooltip() {
        positionTooltip();
        tooltip.classList.add('visible');
    }
    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    // --- Pointer / mouse events ---
    el.addEventListener('mouseenter', () => {
        showTooltip();
    });
    el.addEventListener('mouseleave', () => {
        hideTooltip();
    });

    // --- Keyboard accessibility (Enter to open) ---
    el.addEventListener('focus', () => {
        showTooltip();
    });
    el.addEventListener('blur', () => {
        hideTooltip();
    });
    el.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
            window.open(icon.link, "_self");
        }
    });

    // --- Touch behavior: first tap shows tooltip, second tap navigates ---
    if (isTouchDevice) {
        el.addEventListener('click', (e) => {
            // If previously tapped, follow link
            if (el.dataset.tapped === "1") {
                window.open(icon.link, "_self");
                return;
            }
            // Prevent immediate navigation, show tooltip
            e.preventDefault();
            e.stopPropagation();
            el.dataset.tapped = "1";
            showTooltip();

            // clear tapped state after 1.6s
            setTimeout(() => {
                el.dataset.tapped = "0";
                hideTooltip();
            }, 1600);
        });

        // hide tooltip when tapping anywhere else
        document.addEventListener('click', (ev) => {
            if (!el.contains(ev.target)) {
                el.dataset.tapped = "0";
                hideTooltip();
            }
        }, { capture: true });
    } else {
        // non-touch: click immediately navigates
        el.addEventListener('click', () => {
            window.open(icon.link, "_self");
        });
    }

    // Append icon to container AFTER tooltip so tooltip sits below in DOM (z-index controlled in CSS)
    mapContainer.appendChild(el);

    // reposition tooltip if window resizes or container changes
    window.addEventListener('resize', () => {
        if (tooltip.classList.contains('visible')) positionTooltip();
    });
});


    initPathFinder();
};

function initPathFinder() {
    const pathFinder = new PathFinder();
    const canvas = document.getElementById('path-canvas');
    const mapContainer = document.getElementById('map-container');
    const campusMap = document.getElementById('campus-map');

    // Resize canvas to match PNG scaling
    function resizeCanvas() {
    const rect = campusMap.getBoundingClientRect();
    canvas.width = rect.width;   // drawing space = visible size
    canvas.height = rect.height;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // UI elements
    const toggleBtn = document.getElementById('toggle-pathfinder');
    const pathfinderPanel = document.getElementById('pathfinder-panel');
    const startPointDropdown = document.getElementById('start-point-dropdown');
    const endPointDropdown = document.getElementById('end-point-dropdown');
    const findPathBtn = document.getElementById('find-path');
    const clearPathBtn = document.getElementById('clear-path');
    const pathInfo = document.getElementById('path-info');
    const pathDistance = document.getElementById('path-distance');
    const pathTime = document.getElementById('path-time');

    let startPoint = null;
    let endPoint = null;
    let startMarker = null;
    let endMarker = null;
    let currentPath = null;

    // Load data
    pathFinder.loadData().then(success => {
        if (!success) {
            console.error("Failed to load pathfinder data");
            return;
        }

        const ctx = canvas.getContext('2d');

        populateLocationDropdowns();
    });

    function populateLocationDropdowns() {
        const keyLocations = pathFinder.getNodesByType("building").concat(
            pathFinder.getNodesByType("gate")
        );
        keyLocations.sort((a, b) => a.name.localeCompare(b.name));

        keyLocations.forEach(location => {
            const startOption = document.createElement('option');
            startOption.value = location.id;
            startOption.textContent = location.name;
            startPointDropdown.appendChild(startOption);

            const endOption = document.createElement('option');
            endOption.value = location.id;
            endOption.textContent = location.name;
            endPointDropdown.appendChild(endOption);
        });
    }

    toggleBtn.addEventListener('click', () => {
        if (pathfinderPanel.classList.contains('hidden')) {
            pathfinderPanel.classList.remove('hidden');
            toggleBtn.textContent = 'Hide';
        } else {
            pathfinderPanel.classList.add('hidden');
            toggleBtn.textContent = 'Show';
        }
    });

    startPointDropdown.addEventListener('change', function() {
        const nodeId = this.value;
        if (nodeId) {
            const node = pathFinder.getNode(nodeId);
            if (node) {
                startPoint = { x: node.x, y: node.y, id: nodeId, name: node.name };

                if (startMarker) {
                    startMarker.style.left = `${node.x}%`;
                    startMarker.style.top = `${node.y}%`;
                } else {
                    startMarker = createMarker(node.x, node.y, 'start-point');
                    mapContainer.appendChild(startMarker);
                }

                if (endPoint) findPathBtn.disabled = false;
            }
        }
    });

    endPointDropdown.addEventListener('change', function() {
        const nodeId = this.value;
        if (nodeId) {
            const node = pathFinder.getNode(nodeId);
            if (node) {
                endPoint = { x: node.x, y: node.y, id: nodeId, name: node.name };

                if (endMarker) {
                    endMarker.style.left = `${node.x}%`;
                    endMarker.style.top = `${node.y}%`;
                } else {
                    endMarker = createMarker(node.x, node.y, 'end-point');
                    mapContainer.appendChild(endMarker);
                }

                if (startPoint) findPathBtn.disabled = false;
            }
        }
    });

    function createMarker(x, y, className) {
        const marker = document.createElement('div');
        marker.className = `point-marker ${className}`;
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        return marker;
    }

    findPathBtn.addEventListener('click', () => {
        if (!startPoint || !endPoint) return;

        const startNodeId = startPoint.id;
        const endNodeId = endPoint.id;

        currentPath = pathFinder.findShortestPath(startNodeId, endNodeId);
        renderPath(currentPath.coordinates);

        pathInfo.classList.remove('hidden');
        pathDistance.textContent = currentPath.distance.toFixed(0);

        const minutes = Math.floor(currentPath.estimatedTime);
        const seconds = Math.round((currentPath.estimatedTime - minutes) * 60);

        let timeDisplay;
        if (minutes === 0) timeDisplay = `${seconds} seconds`;
        else if (seconds === 0) timeDisplay = `${minutes} minute${minutes > 1 ? 's' : ''}`;
        else timeDisplay = `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} second${seconds > 1 ? 's' : ''}`;

        pathTime.textContent = timeDisplay;
        clearPathBtn.disabled = false;
    });

    clearPathBtn.addEventListener('click', () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (startMarker) { mapContainer.removeChild(startMarker); startMarker = null; }
        if (endMarker) { mapContainer.removeChild(endMarker); endMarker = null; }

        startPoint = null;
        endPoint = null;
        currentPath = null;

        startPointDropdown.value = '';
        endPointDropdown.value = '';

        pathInfo.classList.add('hidden');
        findPathBtn.disabled = true;
        clearPathBtn.disabled = true;
    });

    function renderPath(coordinates) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!coordinates || coordinates.length < 2) return;

        const pixelCoords = coordinates.map(coord => toCanvasCoords(coord, canvas));

        ctx.beginPath();
        ctx.moveTo(pixelCoords[0].x, pixelCoords[0].y);
        for (let i = 1; i < pixelCoords.length; i++) {
            ctx.lineTo(pixelCoords[i].x, pixelCoords[i].y);
        }

        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#0066cc';
        pixelCoords.forEach(coord => {
            ctx.beginPath();
            ctx.arc(coord.x, coord.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// === ICON DATA (unchanged) ===
const iconData = [
    { name: "St. Albertus Magnus Building", x: 31, y: 45, link:"pages/st.-albertus-magnus.html", img: "assets/icons/albertus.png" },
    { name: "St. Jacques Building", x: 52, y: 21, link: "pages/st.-jacques.html", img: "assets/icons/jacques.png" },
    { name: "St. Thomas Aquinas Building", x: 47, y: 45, link:"pages/st.-thomas-aquinas.html", img: "assets/icons/aquinas.png" },
    { name: "St. Catherine Building", x: 45, y: 54, link:"pages/st.-catherine.html", img: "assets/icons/catherine.png" },
    { name: "St. Dominic Building", x: 47, y: 65, link:"pages/st.-dominic.html", img: "assets/icons/dominic.png" },
    { name: "Gymnasium", x: 30, y: 75, link:"360-viewer.html?room=Gym" },
    { name: "Auditorium", x: 34, y: 66, link:"360-viewer.html?room=Auditorium", img: "assets/icons/auditorium.png" },
    { name:"St. Martin Complex", x: 20, y: 54, link:"360-viewer.html?room=St. Martin Sports Complex", img: "assets/icons/martin.png" },
    { name:"St. Rose", x:59, y:60, link:"pages/st.-rose.html", img: "assets/icons/rose.png" },
    { name:"Mother Francisca Outreach Center", x:66, y:87, link:"pages/mother-natividad.html" },
    { name:"Gate 1", x:70, y:83, link:"360-viewer.html?room=Gate 1", img: "assets/icons/gate 1.png" },
    { name:"Gate 2", x:65, y:66, link:"360-viewer.html?room=Gate 2", img: "assets/icons/gate 2.png" },
    { name:"Gate 3", x:77, y:38, link:"360-viewer.html?room=Gate 3", img: "assets/icons/gate 3.png" },
    { name:"Gate 4", x:29, y:15, link:"360-viewer.html?room=Gate 4", img: "assets/icons/gate 4.png" }
];

let rooms = [];

fetch('data/rooms.json')
  .then(res => {
    if (!res.ok) throw new Error("Failed to load JSON");
    return res.json();
  })
  .then(data => {
    console.log("ROOMS LOADED:", data);
    rooms = data;
  })
  .catch(err => {
    console.error("Could not load rooms.json:", err);
  });

// data/hours-data.js
// Define common opening hours patterns
const hourPatterns = {
  facultyOffice: { open: "07:00", close: "16:00" },
  classroom: { open: "07:00", close: "19:00" },
  canteen: { open: "07:00", close: "17:00" },
  kindergarten: { open: "07:00", close: "15:00" },
  auditorium: { open: "07:30", close: "19:00" }
};

// Helper function to create room entries with the same hours
function createRooms(prefix, count, pattern) {
  const rooms = {};
  for (let i = 1; i <= count; i++) {
    const roomNumber = i.toString().padStart(2, '0');
    rooms[`${prefix}${roomNumber}`] = pattern;
  }
  return rooms;
}

// data/hours-data.js
const hoursMap = {
  // === St. Albertus Magnus Building ===
  "CEIT Faculty Room": { open: "07:00", close: "16:00" },
  "CEIT Chairperson Room": { open: "07:00", close: "16:00" },
  "Mikrotik Academy": { open: "07:00", close: "19:00" },
  "CEIT Equipment Room": { open: "07:00", close: "16:00" },
  "Electronic and Circuits Laboratory": { open: "07:00", close: "19:00" },
  "CEIT Lecture Room": { open: "07:00", close: "19:00" },
  "Drawing Laboratory": { open: "07:00", close: "19:00" },
  "Mac Laboratory": { open: "07:00", close: "19:00" },
  "CEIT Computer Laboratory": { open: "07:00", close: "19:00" },
  "Storage Room": { open: "07:00", close: "16:00" },
  "CBA Faculty Room": { open: "07:00", close: "16:00" },
  "CBA Chairperson Room": { open: "07:00", close: "16:00" },
  "ALM401": { open: "07:00", close: "19:00" },
  "ALM402": { open: "07:00", close: "19:00" },
  "ALM403": { open: "07:00", close: "19:00" },
  "ALM404": { open: "07:00", close: "19:00" },
  "ALM405": { open: "07:00", close: "19:00" },
  "Business Stimulation Office": { open: "07:00", close: "19:00" },
  "Conference Room": { open: "07:00", close: "19:00" },
  "Learning Resource Center": { open: "07:00", close: "19:00" },
  "Computer Laboratory": { open: "07:00", close: "19:00" },
  "Prefect of Student Formation and Activities": { open: "07:00", close: "16:00" },
  "CON Faculty Room": { open: "07:00", close: "16:00" },
  "CON Chairperson Room": { open: "07:00", close: "16:00" },
  "ALM201a": { open: "07:00", close: "19:00" },
  "ALM201b": { open: "07:00", close: "19:00" },
  "ALM202a": { open: "07:00", close: "19:00" },
  "ALM202b": { open: "07:00", close: "19:00" },
  "Anatomy Room": { open: "07:00", close: "19:00" },
  "Student Affairs and Activities": { open: "07:00", close: "16:00" },
  "COE Faculty Room": { open: "07:00", close: "16:00" },
  "COE Chairperson Room": { open: "07:00", close: "16:00" },
  "ALM101": { open: "07:00", close: "19:00" },
  "ALM102": { open: "07:00", close: "19:00" },
  "ALM103": { open: "07:00", close: "19:00" },
  "ALM104": { open: "07:00", close: "19:00" },
  "ALM105": { open: "07:00", close: "19:00" },
  "Flambeau Publications": { open: "07:00", close: "19:00" },
  "St. Albertus Magnus Canteen": { open: "07:00", close: "17:00" },

  // === Mother Natividad Building ===
  "Faculty Room": { open: "07:00", close: "16:00" },
  "Computer Laboratory - Kinder": { open: "07:00", close: "15:00" },
  "Mother Francisca Outreach Center": { open: "07:00", close: "16:00" },
  "Sewing Center": { open: "07:00", close: "16:00" },
  "Casa Sebastiana": { open: "07:00", close: "16:00" },
  "Room 101": { open: "07:00", close: "15:00" },
  "Room 102": { open: "07:00", close: "15:00" },
  "Room 201": { open: "07:00", close: "15:00" },
  "Room 202": { open: "07:00", close: "15:00" },
  "Room 203": { open: "07:00", close: "15:00" },
  "Room 204": { open: "07:00", close: "15:00" },
  "Playground": { open: "07:00", close: "16:00" },
  "Play Room": { open: "07:00", close: "16:00" },

  // === St. Catherine Building ===
  "Casa Antonia-Training Hotel": { open: "07:00", close: "17:00" },
  "Nutrition Laboratory 1": { open: "07:00", close: "19:00" },
  "Sewing Room": { open: "07:00", close: "19:00" },
  "Wellness Room": { open: "07:00", close: "19:00" },
  "Nutrition Laboratory 2": { open: "07:00", close: "19:00" },
  "SCB201": { open: "07:00", close: "19:00" },
  "SCB202": { open: "07:00", close: "19:00" },
  "SCB203": { open: "07:00", close: "19:00" },
  "SCB204": { open: "07:00", close: "19:00" },
  "SCB205": { open: "07:00", close: "19:00" },
  "SCB206": { open: "07:00", close: "19:00" },
  "SCB207": { open: "07:00", close: "19:00" },
  "SCB208": { open: "07:00", close: "19:00" },
  "SCB209": { open: "07:00", close: "19:00" },
  "SCB210": { open: "07:00", close: "19:00" },
  "Grade School Prefect of Student Formation and Grade Level Leader": { open: "07:00", close: "16:00" },
  "SCB301": { open: "07:00", close: "19:00" },
  "SCB302": { open: "07:00", close: "19:00" },
  "SCB303": { open: "07:00", close: "19:00" },
  "SCB304": { open: "07:00", close: "19:00" },
  "SCB305": { open: "07:00", close: "19:00" },
  "SCB306": { open: "07:00", close: "19:00" },
  "SCB307": { open: "07:00", close: "19:00" },
  "SCB308": { open: "07:00", close: "19:00" },
  "SCB309": { open: "07:00", close: "19:00" },
  "Mimeographing Room": { open: "07:00", close: "16:00" },
  "SCB401": { open: "07:00", close: "19:00" },
  "SCB402": { open: "07:00", close: "19:00" },
  "SCB403": { open: "07:00", close: "19:00" },
  "SCB404": { open: "07:00", close: "19:00" },
  "SCB405": { open: "07:00", close: "19:00" },
  "Math Faculty": { open: "07:00", close: "16:00" },
  "Principal's Office": { open: "07:00", close: "16:00" },
  "SCB501": { open: "07:00", close: "19:00" },
  "SCB502": { open: "07:00", close: "19:00" },
  "SCB503": { open: "07:00", close: "19:00" },
  "SCB504": { open: "07:00", close: "19:00" },
  "SCB505": { open: "07:00", close: "19:00" },
  "SCB506": { open: "07:00", close: "19:00" },
  "Auditorium": { open: "07:30", close: "19:00" },

  // === St. Dominic Building ===
  "Dominic Canteen": { open: "07:00", close: "17:00" },
  "Mikrotik Training Center": { open: "07:00", close: "19:00" },
  "IBED Student Council Office": { open: "07:00", close: "16:00" },
  "SCT Assessment Center": { open: "07:00", close: "16:00" },
  "SCT Archives": { open: "07:00", close: "16:00" },
  "St. Rose of Lima Hall": { open: "07:00", close: "19:00" },
  "Comp Lab Office": { open: "07:00", close: "16:00" },
  "College Comp Lab": { open: "07:00", close: "19:00" },
  "Accreditation Center": { open: "07:00", close: "16:00" },
  "HS Comp Lab": { open: "07:00", close: "19:00" },
  "Office of the President": { open: "07:00", close: "16:00" },
  "Cyber Siena": { open: "07:00", close: "19:00" },
  "Finance Office": { open: "07:00", close: "16:00" },
  "Office of the Guidance Services": { open: "07:00", close: "16:00" },
  "Registrar's Office": { open: "07:00", close: "16:00" },
  "Admission and Marketing": { open: "07:00", close: "16:00" },
  "Catharsis Room": { open: "07:00", close: "16:00" },
  "Mindfulness Room": { open: "07:00", close: "19:00" },
  "Multipurpose Room": { open: "07:00", close: "19:00" },
  "Instructional Media Center Office": { open: "07:00", close: "16:00" },
  "GS LRC": { open: "07:00", close: "19:00" },
  "CL VE Faculty": { open: "07:00", close: "16:00" },
  "Safety and Disaster Risk Management Office": { open: "07:00", close: "16:00" },
  "SDB201": { open: "07:00", close: "19:00" },
  "SDB202": { open: "07:00", close: "19:00" },
  "SDB203": { open: "07:00", close: "19:00" },
  "Reverb Lab": { open: "07:00", close: "19:00" },
  "Music Room": { open: "07:00", close: "19:00" },
  "SDB311": { open: "07:00", close: "19:00" },
  "SDB312": { open: "07:00", close: "19:00" },
  "SDB313": { open: "07:00", close: "19:00" },
  "SDB314": { open: "07:00", close: "19:00" },
  "SDB315": { open: "07:00", close: "19:00" },
  "SDB316": { open: "07:00", close: "19:00" },
  "SDB317": { open: "07:00", close: "19:00" },
  "Exhibit Room": { open: "07:00", close: "19:00" },
  "SDB318": { open: "07:00", close: "19:00" },
  "SDB320": { open: "07:00", close: "19:00" },
  "SDB321": { open: "07:00", close: "19:00" }, 
  "SDB322": { open: "07:00", close: "19:00" },
  "SDB323": { open: "07:00", close: "19:00" }, 
  "Science Laboratory Office": { open: "07:00", close: "16:00" },
  "Reading Faculty": { open: "07:00", close: "16:00" },
  "AP and Filipino Faculty": { open: "07:00", close: "16:00" },
  "English Faculty": { open: "07:00", close: "16:00" },
  "MAPEH Faculty": { open: "07:00", close: "16:00" },
  "Science Faculty": { open: "07:00", close: "16:00" },
  "TLE/ICT Area": { open: "07:00", close: "19:00" },
  "SHS Year Level Leader": { open: "07:00", close: "16:00" },
  "SHS Prefect of Formation": { open: "07:00", close: "16:00" },
  "SDB401": { open: "07:00", close: "19:00" },
  "SDB402": { open: "07:00", close: "19:00" },
  "SDB403": { open: "07:00", close: "19:00" },
  "SDB404": { open: "07:00", close: "19:00" },
  "SDB405": { open: "07:00", close: "19:00" },
  "SDB406": { open: "07:00", close: "19:00" },
  "SDB407": { open: "07:00", close: "19:00" },
  "SDB408": { open: "07:00", close: "19:00" },
  "SDB409": { open: "07:00", close: "19:00" },
  "SDB410": { open: "07:00", close: "19:00" },
  "SDB411": { open: "07:00", close: "19:00" },
  "SDB412": { open: "07:00", close: "19:00" },
  "SDB413": { open: "07:00", close: "19:00" },
  "SDB414": { open: "07:00", close: "19:00" },
  "SDB415": { open: "07:00", close: "19:00" },
  "Publication Office": { open: "07:00", close: "19:00" },
  "High School Prefect of Student Formation Office": { open: "07:00", close: "16:00" },
  "JLL": { open: "07:00", close: "16:00" },
  "SDB501": { open: "07:00", close: "19:00" },
  "SDB502": { open: "07:00", close: "19:00" },
  "SDB503": { open: "07:00", close: "19:00" },
  "SDB504": { open: "07:00", close: "19:00" },
  "SDB505": { open: "07:00", close: "19:00" },
  "SDB506": { open: "07:00", close: "19:00" },
  "SDB507": { open: "07:00", close: "19:00" },
  "SDB511": { open: "07:00", close: "19:00" },
  "SDB512": { open: "07:00", close: "19:00" },
  "SDB513": { open: "07:00", close: "19:00" },
  "SDB514": { open: "07:00", close: "19:00" },

  // === St. Jacques Building ===
  "CIHM Faculty Office": { open: "07:00", close: "16:00" },
  "CIHM Chairperson Office": { open: "07:00", close: "16:00" },
  "Practicum Office": { open: "07:00", close: "16:00" },
  "Travel Management Office": { open: "07:00", close: "19:00" },
  "Bar Laboratory": { open: "07:00", close: "19:00" },
  "Suite Royale": { open: "07:00", close: "19:00" },
  "La Suite Principale de Serrano": { open: "07:00", close: "19:00" },
  "Computer Laboratory": { open: "07:00", close: "19:00" },
  "Pastry Kitchen": { open: "07:00", close: "19:00" },
  "Pastry Kitchen 2": { open: "07:00", close: "19:00" },
  "Pastry Kitchen 3": { open: "07:00", close: "19:00" },
  "Hot Kitchen 1": { open: "07:00", close: "19:00" },
  "Hot Kitchen 2": { open: "07:00", close: "19:00" },
  "Commercial Kitchen": { open: "07:00", close: "19:00" },
  "Bill Shaw Cafe": { open: "07:00", close: "17:00" },
  "Conference Hall 1": { open: "07:00", close: "19:00" },
  "Conference Hall 2": { open: "07:00", close: "19:00" },
  "Conference Hall 3": { open: "07:00", close: "19:00" },
  "Salle De Conference Vibal 1": { open: "07:00", close: "19:00" },
  "Salle De Conference Vibal 2": { open: "07:00", close: "19:00" },
  "Big Hall 1": { open: "07:00", close: "19:00" },
  "Big Hall 2": { open: "07:00", close: "19:00" },
  "Big Hall 3": { open: "07:00", close: "19:00" },
  "St. Vincent Ferrer Prayer Room": { open: "07:00", close: "19:00" },
  "Fitness Room": { open: "07:00", close: "19:00" },
  "General Store Room": { open: "07:00", close: "16:00" },
  "General Stock Room": { open: "07:00", close: "16:00" },
  "Linen Room 1": { open: "07:00", close: "16:00" },
  "Mistress Room": { open: "07:00", close: "16:00" },
  "Laundry Area (Personnel Only)": { open: "07:00", close: "16:00" },
  "SJB301": { open: "07:00", close: "19:00" },
  "SJB302": { open: "07:00", close: "19:00" },
  "SJB303": { open: "07:00", close: "19:00" },
  "SJB304": { open: "07:00", close: "19:00" },
  "SJB305": { open: "07:00", close: "19:00" },
  "SJB306": { open: "07:00", close: "19:00" },
  // SJB401-SJB420
  ...Object.fromEntries(
    Array.from({length: 20}, (_, i) => [
      `SJB4${(i+1).toString().padStart(2, '0')}`,
      { open: "07:00", close: "19:00" }
    ])
  ),

  // === St. Rose Building ===
  "Campus Ministry Office": { open: "07:00", close: "16:00" },
  "Health Services": { open: "07:00", close: "16:00" },
  "Student Services Director": { open: "07:00", close: "16:00" },
  "Institutional Student Affairs": { open: "07:00", close: "16:00" },
  "HRM and D Office": { open: "07:00", close: "16:00" },
  "Research Development Center": { open: "07:00", close: "17:00" },
  "Defense Room": { open: "07:00", close: "17:00" },
  "Chapel": { open: "07:00", close: "19:00" },
  "Sacristy 1": { open: "07:00", close: "19:00" },
  "Holy Rosary Canteen": { open: "07:00", close: "17:00" },
  "Pantry": { open: "07:00", close: "16:00" },

  // === St. Thomas Aquinas Building ===
  "STB101": { open: "07:00", close: "19:00" },
  "STB102": { open: "07:00", close: "19:00" },
  "STB103": { open: "07:00", close: "19:00" },
  "Office of the Principal and Subject Area Coordinators": { open: "07:00", close: "16:00" },
  "Office of the Dean": { open: "07:00", close: "16:00" },
  "Office of the NSTP Coordinator": { open: "07:00", close: "16:00" },
  "STB201": { open: "07:00", close: "19:00" },
  "STB202": { open: "07:00", close: "19:00" },
  "STB203": { open: "07:00", close: "19:00" },
  "STB204": { open: "07:00", close: "19:00" },
  "STB205": { open: "07:00", close: "19:00" },
  "STB301": { open: "07:00", close: "19:00" },
  "SHS and JHS Library": { open: "07:00", close: "19:00" },
  "STB401": { open: "07:00", close: "19:00" },
  "STB402": { open: "07:00", close: "19:00" },
  "STB403": { open: "07:00", close: "19:00" },
  "STB404": { open: "07:00", close: "19:00" },
  "STB405": { open: "07:00", close: "19:00" },
  "STB501": { open: "07:00", close: "19:00" },
  "STB502": { open: "07:00", close: "19:00" },
  "STB503": { open: "07:00", close: "19:00" },
  "STB504": { open: "07:00", close: "19:00" },
  "STB505": { open: "07:00", close: "19:00" },
  "STB506": { open: "07:00", close: "19:00" }
};

function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":").map(Number);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(minute).padStart(2,'0')} ${ampm}`;
}

function isOfficeOpen(hours) {
  if (!hours || !hours.open || !hours.close) return null;
  const now = new Date();
  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);
  const open = new Date(now); open.setHours(openH, openM, 0, 0);
  const close = new Date(now); close.setHours(closeH, closeM, 0, 0);
  return now >= open && now <= close;
}

function lookupHoursForMatch(match) {
  if (!match) return null;
  if (match.hours && match.hours.open && match.hours.close) return match.hours;
  const keysToTry = [match.name, match.code, match.building].filter(Boolean);
  for (const key of keysToTry) {
    const found = hoursMap[key] || hoursMap[key.trim()] || hoursMap[key.toLowerCase()];
    if (found) return found;
  }
  const text = ((match.name || "") + " " + (match.code || "") + " " + (match.building || "")).toLowerCase();
  for (const k in hoursMap) {
    if (text.includes(k.toLowerCase())) return hoursMap[k];
  }
  return null;
}

const searchInput = document.getElementById("search");
const resultsList = document.getElementById("search-results");

if (searchInput && resultsList) {
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && resultsList.firstChild) resultsList.firstChild.click();
  });

  searchInput.addEventListener("input", () => {
    const val = searchInput.value.toLowerCase().trim();
    resultsList.innerHTML = "";
    if (val.length < 2) return;

    const matches = rooms.filter(r =>
      (r.code || "").toLowerCase().includes(val) ||
      (r.name || "").toLowerCase().includes(val) ||
      (r.building || "").toLowerCase().includes(val)
    );

    matches.forEach(match => {
      const li = document.createElement("li");
      const hours = lookupHoursForMatch(match);
      let hoursHtml = "";
      if (hours) {
        const openNow = isOfficeOpen(hours);
        hoursHtml = `<div style="font-size:0.85em;margin-top:6px;color:#333;">
                       ${formatTime12hr(hours.open)} - ${formatTime12hr(hours.close)} 
                       <strong style="color:${openNow ? 'green' : 'red'};margin-left:8px;">${openNow ? 'Open' : 'Closed'}</strong>
                     </div>`;
      }

      li.innerHTML = `<strong>•${match.code || ""}</strong> ${match.name || ""}<br />
                      <span style="font-size: 0.8em; opacity: 0.8;">${match.building || ""}</span>
                      ${hoursHtml}`;
      li.style.cursor = "pointer";

      li.onclick = () => {
        if (match.code && match.code.trim() !== "") {
          window.location.href = `../360-viewer.html?room=${encodeURIComponent(match.code)}`;
        } else if (match.building) {
          window.location.href = `pages/${match.building.toLowerCase().replace(/\s+/g, "-")}.html`;
        }
      };
      resultsList.appendChild(li);
    });
  });
}


const zoomStep = 0.25;
const minZoom = 0.6;
const maxZoom = 2.5;

const zoomTarget = document.getElementById("map-container");

window.addEventListener("wheel", function (e) {
  if (!e.ctrlKey) return; // hold Ctrl to zoom, prevents accidental zoom

  e.preventDefault();
  const delta = e.deltaY;

  if (delta > 0 && scale > minZoom) {
    scale -= zoomStep;
  } else if (delta < 0 && scale < maxZoom) {
    scale += zoomStep;
  }

  zoomTarget.style.transform = `scale(${scale})`;
}, { passive: false });

function zoomIn() {
  if (scale < maxZoom) {
    scale += zoomStep;
    zoomTarget.style.transform = `scale(${scale})`;
  }
}

function zoomOut() {
  if (scale > minZoom) {
    scale -= zoomStep;
    zoomTarget.style.transform = `scale(${scale})`;
  }
}