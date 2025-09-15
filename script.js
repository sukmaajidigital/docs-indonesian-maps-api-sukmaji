// Indonesian Maps API Documentation - Main JavaScript File

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://api.sukmaaji.my.id/indonesian-maps',
    DEFAULT_COORDINATE: [-6.2088, 106.8456], // Jakarta
    DEFAULT_ZOOM: 5,
    INDONESIA_BOUNDS: [[-11, 95], [6, 141]]
};

// Global variables
let map;
let provincesData = [];
let currentProvinceLayer = null;
let chartInstances = {};

// Utility functions
const utils = {
    formatNumber: (num) => {
        return new Intl.NumberFormat('id-ID').format(num);
    },

    formatArea: (area) => {
        const numArea = parseFloat(area);
        return isNaN(numArea) ? 'N/A' : utils.formatNumber(numArea) + ' km²';
    },

    formatPopulation: (pop) => {
        const numPop = parseFloat(pop);
        return isNaN(numPop) ? 'N/A' : utils.formatNumber(numPop);
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }
    },

    showError: (elementId, message) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
            `;
        }
    }
};

// API service
const apiService = {
    async fetchData(endpoint) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API fetch error:', error);
            throw error;
        }
    },

    async getProvinces() {
        return await this.fetchData('/provinsi');
    },

    async getProvinceDetail(code) {
        return await this.fetchData(`/provinsi/${code}`);
    },

    async getProvinceGeo(code) {
        return await this.fetchData(`/provinsi/${code}/geo`);
    },

    async getCities(provinceCode = null, limit = 50) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (provinceCode) {
            params.append('kode_provinsi', provinceCode);
        }
        return await this.fetchData(`/kabupaten-kota?${params}`);
    },

    async getIslands(limit = 50) {
        return await this.fetchData(`/pulau?limit=${limit}`);
    }
};

// Map functionality
const mapManager = {
    init() {
        // Initialize map
        map = L.map('indonesia-map').setView(CONFIG.DEFAULT_COORDINATE, CONFIG.DEFAULT_ZOOM);

        // Add base layers
        const baseLayers = {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }),
            'Satellite': L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                attribution: '© Google'
            }),
            'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap contributors'
            })
        };

        // Add default layer
        baseLayers['OpenStreetMap'].addTo(map);

        // Add layer control
        L.control.layers(baseLayers).addTo(map);

        // Set max bounds to Indonesia
        map.setMaxBounds(CONFIG.INDONESIA_BOUNDS);

        // Load provinces data and add to map
        this.loadProvincesData();
    },

    async loadProvincesData() {
        try {
            const response = await apiService.getProvinces();
            if (response.success && response.data) {
                provincesData = response.data;
                this.populateProvinceSelector();
                await this.addProvinceMarkers();
            }
        } catch (error) {
            console.error('Error loading provinces:', error);
        }
    },

    populateProvinceSelector() {
        const selector = document.getElementById('province-selector');
        if (selector) {
            selector.innerHTML = '<option value="">Select a province...</option>';
            provincesData.forEach(province => {
                const option = document.createElement('option');
                option.value = province.kode_provinsi;
                option.textContent = province.nama_provinsi;
                selector.appendChild(option);
            });
        }
    },

    async addProvinceMarkers() {
        for (const province of provincesData) {
            try {
                const geoResponse = await apiService.getProvinceGeo(province.kode_provinsi);
                if (geoResponse.success && geoResponse.data) {
                    const geoData = geoResponse.data;
                    const lat = parseFloat(geoData.lat);
                    const lng = parseFloat(geoData.lng);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        const marker = L.marker([lat, lng]).addTo(map);

                        const popupContent = this.createProvincePopup(geoData);
                        marker.bindPopup(popupContent);

                        // Store reference for later use
                        marker.provinceData = geoData;
                    }
                }
            } catch (error) {
                console.error(`Error loading geo data for ${province.nama_provinsi}:`, error);
            }
        }
    },

    createProvincePopup(data) {
        return `
            <div class="popup-content">
                <h6 class="popup-title">${data.nama_provinsi}</h6>
                <div class="popup-info">
                    <div class="info-row">
                        <span class="info-label">Capital:</span>
                        <span class="info-value">${data.ibukota || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Population:</span>
                        <span class="info-value">${utils.formatPopulation(data.penduduk)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Area:</span>
                        <span class="info-value">${utils.formatArea(data.luas)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Elevation:</span>
                        <span class="info-value">${data.elv ? data.elv + 'm' : 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Timezone:</span>
                        <span class="info-value">UTC+${data.tz || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    },

    async selectProvince(provinceCode) {
        if (!provinceCode) {
            this.resetMap();
            return;
        }

        try {
            const geoResponse = await apiService.getProvinceGeo(provinceCode);
            if (geoResponse.success && geoResponse.data) {
                const geoData = geoResponse.data;
                const lat = parseFloat(geoData.lat);
                const lng = parseFloat(geoData.lng);

                if (!isNaN(lat) && !isNaN(lng)) {
                    map.setView([lat, lng], 8);
                    this.showProvinceInfo(geoData);
                }
            }
        } catch (error) {
            console.error('Error selecting province:', error);
        }
    },

    showProvinceInfo(data) {
        const infoElement = document.getElementById('province-info');
        const contentElement = document.getElementById('province-info-content');

        if (infoElement && contentElement) {
            contentElement.innerHTML = `
                <div class="info-item">
                    <span class="info-label">Province:</span>
                    <span class="info-value">${data.nama_provinsi}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Capital:</span>
                    <span class="info-value">${data.ibukota || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Population:</span>
                    <span class="info-value">${utils.formatPopulation(data.penduduk)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Area:</span>
                    <span class="info-value">${utils.formatArea(data.luas)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Coordinates:</span>
                    <span class="info-value">${data.lat}, ${data.lng}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Elevation:</span>
                    <span class="info-value">${data.elv ? data.elv + 'm' : 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Timezone:</span>
                    <span class="info-value">UTC+${data.tz || 'N/A'}</span>
                </div>
            `;
            infoElement.style.display = 'block';
        }
    },

    resetMap() {
        map.setView(CONFIG.DEFAULT_COORDINATE, CONFIG.DEFAULT_ZOOM);
        const infoElement = document.getElementById('province-info');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
    }
};

// Demo functionality
const demoManager = {
    init() {
        const endpointSelect = document.getElementById('endpoint-select');
        const endpointUrl = document.getElementById('endpoint-url');
        const tryButton = document.getElementById('try-endpoint');

        if (endpointSelect && endpointUrl) {
            endpointSelect.addEventListener('change', (e) => {
                endpointUrl.value = CONFIG.API_BASE_URL + e.target.value;
            });

            // Set initial value
            endpointUrl.value = CONFIG.API_BASE_URL + endpointSelect.value;
        }

        if (tryButton) {
            tryButton.addEventListener('click', this.tryEndpoint);
        }
    },

    async tryEndpoint() {
        const endpointSelect = document.getElementById('endpoint-select');
        const responseOutput = document.getElementById('response-output');
        const responseStatus = document.getElementById('response-status');

        if (!endpointSelect || !responseOutput || !responseStatus) return;

        const endpoint = endpointSelect.value;

        // Show loading
        responseOutput.innerHTML = '<code class="language-json">Loading...</code>';
        responseStatus.innerHTML = '<span class="badge bg-warning">Loading</span>';

        try {
            const data = await apiService.fetchData(endpoint);

            // Show success response
            responseOutput.innerHTML = `<code class="language-json">${JSON.stringify(data, null, 2)}</code>`;
            responseStatus.innerHTML = '<span class="badge bg-success">200 OK</span>';

            // Re-highlight syntax
            if (window.Prism) {
                Prism.highlightAll();
            }
        } catch (error) {
            // Show error response
            responseOutput.innerHTML = `<code class="language-json">${JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString()
            }, null, 2)}</code>`;
            responseStatus.innerHTML = '<span class="badge bg-danger">Error</span>';
        }
    }
};

// Visualization functionality
const visualizationManager = {
    init() {
        this.loadProvincesTable();
        this.loadCharts();
        this.initTableSearch();
    },

    async loadProvincesTable() {
        try {
            utils.showLoading('provinces-table-body');

            const response = await apiService.getProvinces();
            if (response.success && response.data) {
                // Get detailed geo data for all provinces
                const detailedData = await Promise.all(
                    response.data.map(async (province) => {
                        try {
                            const geoResponse = await apiService.getProvinceGeo(province.kode_provinsi);
                            return geoResponse.success ? { ...province, geo: geoResponse.data } : province;
                        } catch (error) {
                            return province;
                        }
                    })
                );

                this.renderProvincesTable(detailedData);
            }
        } catch (error) {
            utils.showError('provinces-table-body', 'Failed to load provinces data');
        }
    },

    renderProvincesTable(data) {
        const tbody = document.getElementById('provinces-table-body');
        if (!tbody) return;

        tbody.innerHTML = data.map(province => {
            const geo = province.geo || {};
            return `
                <tr>
                    <td><span class="badge bg-primary">${province.kode_provinsi}</span></td>
                    <td><strong>${province.nama_provinsi}</strong></td>
                    <td>${geo.ibukota || 'N/A'}</td>
                    <td>${utils.formatPopulation(geo.penduduk)}</td>
                    <td>${utils.formatArea(geo.luas)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="mapManager.selectProvince('${province.kode_provinsi}')">
                            <i class="fas fa-map-marker-alt me-1"></i>View on Map
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    initTableSearch() {
        const searchInput = document.getElementById('table-search');
        if (searchInput) {
            searchInput.addEventListener('input', utils.debounce((e) => {
                this.filterTable(e.target.value);
            }, 300));
        }
    },

    filterTable(searchTerm) {
        const tbody = document.getElementById('provinces-table-body');
        if (!tbody) return;

        const rows = tbody.getElementsByTagName('tr');
        const term = searchTerm.toLowerCase();

        Array.from(rows).forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    },

    async loadCharts() {
        try {
            const response = await apiService.getProvinces();
            if (response.success && response.data) {
                // Get detailed geo data for charts
                const detailedData = await Promise.all(
                    response.data.slice(0, 10).map(async (province) => {
                        try {
                            const geoResponse = await apiService.getProvinceGeo(province.kode_provinsi);
                            return geoResponse.success ? { ...province, geo: geoResponse.data } : province;
                        } catch (error) {
                            return province;
                        }
                    })
                );

                this.createPopulationChart(detailedData);
                this.createAreaChart(detailedData);
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    },

    createPopulationChart(data) {
        const ctx = document.getElementById('populationChart');
        if (!ctx) return;

        // Filter and sort data by population
        const chartData = data
            .filter(province => province.geo && province.geo.penduduk)
            .sort((a, b) => parseFloat(b.geo.penduduk) - parseFloat(a.geo.penduduk))
            .slice(0, 10);

        if (chartInstances.population) {
            chartInstances.population.destroy();
        }

        chartInstances.population = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(p => p.nama_provinsi),
                datasets: [{
                    data: chartData.map(p => parseFloat(p.geo.penduduk)),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#36A2EB'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.label + ': ' + utils.formatPopulation(context.raw);
                            }
                        }
                    }
                }
            }
        });
    },

    createAreaChart(data) {
        const ctx = document.getElementById('areaChart');
        if (!ctx) return;

        // Filter and sort data by area
        const chartData = data
            .filter(province => province.geo && province.geo.luas)
            .sort((a, b) => parseFloat(b.geo.luas) - parseFloat(a.geo.luas))
            .slice(0, 10);

        if (chartInstances.area) {
            chartInstances.area.destroy();
        }

        chartInstances.area = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(p => p.nama_provinsi),
                datasets: [{
                    label: 'Area (km²)',
                    data: chartData.map(p => parseFloat(p.geo.luas)),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return 'Area: ' + utils.formatArea(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return utils.formatNumber(value);
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Initialize all components
    if (document.getElementById('indonesia-map')) {
        mapManager.init();
    }

    demoManager.init();
    visualizationManager.init();

    // Province selector change
    const provinceSelector = document.getElementById('province-selector');
    if (provinceSelector) {
        provinceSelector.addEventListener('change', (e) => {
            mapManager.selectProvince(e.target.value);
        });
    }

    // Reset map button
    const resetMapButton = document.getElementById('reset-map');
    if (resetMapButton) {
        resetMapButton.addEventListener('click', () => {
            mapManager.resetMap();
            provinceSelector.value = '';
        });
    }

    // Map layer selector
    const mapLayerSelector = document.getElementById('map-layer');
    if (mapLayerSelector) {
        mapLayerSelector.addEventListener('change', (e) => {
            // This would be implemented if we had multiple tile layers
            console.log('Map layer changed to:', e.target.value);
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.offsetTop - navHeight - 20;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize syntax highlighting
    if (window.Prism) {
        Prism.highlightAll();
    }

    // Add fade-in animation to elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
});

// Handle window resize for charts
window.addEventListener('resize', utils.debounce(() => {
    Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            chart.resize();
        }
    });
}, 250));

// Export for global access
window.mapManager = mapManager;
window.demoManager = demoManager;
window.visualizationManager = visualizationManager;
window.apiService = apiService;