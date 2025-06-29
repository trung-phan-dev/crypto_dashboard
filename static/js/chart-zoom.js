// Custom chart zoom and pan functionality
let isDragging = false;
let dragStart = null;
let chartZoomLevel = 1;
let chartPanOffset = 0;

function addChartInteractivity(chart) {
    const canvas = chart.canvas;
    
    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        chartZoomLevel *= zoomFactor;
        chartZoomLevel = Math.max(0.5, Math.min(5, chartZoomLevel));
        
        // Update chart scales
        const xScale = chart.scales.x;
        const range = xScale.max - xScale.min;
        const newRange = range / zoomFactor;
        const center = xScale.getValueForPixel(x);
        
        chart.options.scales.x.min = Math.max(0, center - newRange / 2);
        chart.options.scales.x.max = Math.min(chart.data.labels.length - 1, center + newRange / 2);
        
        chart.update('none');
    });
    
    // Mouse drag pan
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || !dragStart) return;
        
        const deltaX = e.clientX - dragStart.x;
        const xScale = chart.scales.x;
        const pixelRange = xScale.right - xScale.left;
        const dataRange = xScale.max - xScale.min;
        const panAmount = -(deltaX / pixelRange) * dataRange;
        
        const newMin = Math.max(0, (chart.options.scales.x.min || 0) + panAmount);
        const newMax = Math.min(chart.data.labels.length - 1, (chart.options.scales.x.max || chart.data.labels.length - 1) + panAmount);
        
        chart.options.scales.x.min = newMin;
        chart.options.scales.x.max = newMax;
        
        dragStart = { x: e.clientX, y: e.clientY };
        chart.update('none');
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        dragStart = null;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        dragStart = null;
        canvas.style.cursor = 'default';
    });
    
    // Double-click to reset zoom
    canvas.addEventListener('dblclick', () => {
        chartZoomLevel = 1;
        chartPanOffset = 0;
        chart.options.scales.x.min = undefined;
        chart.options.scales.x.max = undefined;
        chart.update();
    });
}