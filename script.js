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
let currentCityLayer = null;
let currentDistrictLayer = null;
let currentVillageLayer = null;
let provinceBoundariesLayer = null;
let cityBoundariesLayer = null;
let chartInstances = {};
let selectedLocation = {
    province: null,
    city: null,
    district: null,
    village: null
};

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
            const fullUrl = `${CONFIG.API_BASE_URL}${endpoint}`;
            console.log('Fetching:', fullUrl); // Debug log

            const response = await fetch(fullUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API fetch error:', error);
            throw error;
        }
    }, async getProvinces() {
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

    async getCityDetail(code) {
        return await this.fetchData(`/kabupaten-kota/${code}`);
    },

    async getCityGeo(code) {
        return await this.fetchData(`/kabupaten-kota/${code}/geo`);
    },

    async getDistricts(cityCode = null, limit = 50) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (cityCode) {
            params.append('kode_kabupaten_kota', cityCode);
        }
        return await this.fetchData(`/kecamatan?${params}`);
    },

    async getDistrictDetail(code) {
        return await this.fetchData(`/kecamatan/${code}`);
    },

    async getVillages(districtCode = null, limit = 50) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (districtCode) {
            params.append('kode_kecamatan', districtCode);
        }
        return await this.fetchData(`/desa-kelurahan?${params}`);
    },

    async getVillageDetail(code) {
        return await this.fetchData(`/desa-kelurahan/${code}`);
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

        // Load only provinces list initially (not geo data)
        this.loadProvincesListOnly();
    },

    async loadProvincesListOnly() {
        try {
            const response = await apiService.getProvinces();
            if (response.success && response.data) {
                provincesData = response.data;
                this.populateProvinceSelector();
                // Don't load all markers initially - only when needed
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

    async populateCitySelector(provinceCode) {
        const selector = document.getElementById('city-selector');
        if (!selector) return;

        if (!provinceCode) {
            selector.innerHTML = '<option value="">Select a city/regency...</option>';
            selector.disabled = true;
            this.clearDistrictSelector();
            return;
        }

        try {
            selector.innerHTML = '<option value="">Loading...</option>';
            selector.disabled = true;

            const response = await apiService.getCities(provinceCode, 100);
            if (response.success && response.data) {
                selector.innerHTML = '<option value="">Select a city/regency...</option>';
                response.data.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.kode_kabupaten_kota;
                    option.textContent = city.nama_kabupaten_kota;
                    selector.appendChild(option);
                });
                selector.disabled = false;
            }
        } catch (error) {
            console.error('Error loading cities:', error);
            selector.innerHTML = '<option value="">Error loading cities</option>';
        }
    },

    async populateDistrictSelector(cityCode) {
        const selector = document.getElementById('district-selector');
        if (!selector) return;

        if (!cityCode) {
            selector.innerHTML = '<option value="">Select a district...</option>';
            selector.disabled = true;
            this.clearVillageSelector();
            return;
        }

        try {
            selector.innerHTML = '<option value="">Loading...</option>';
            selector.disabled = true;

            const response = await apiService.getDistricts(cityCode, 100);
            if (response.success && response.data) {
                selector.innerHTML = '<option value="">Select a district...</option>';
                response.data.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district.kode_kecamatan;
                    option.textContent = district.nama_kecamatan;
                    selector.appendChild(option);
                });
                selector.disabled = false;
            }
        } catch (error) {
            console.error('Error loading districts:', error);
            selector.innerHTML = '<option value="">Error loading districts</option>';
        }
    },

    async populateVillageSelector(districtCode) {
        const selector = document.getElementById('village-selector');
        if (!selector) return;

        if (!districtCode) {
            selector.innerHTML = '<option value="">Select a village...</option>';
            selector.disabled = true;
            return;
        }

        try {
            selector.innerHTML = '<option value="">Loading...</option>';
            selector.disabled = true;

            const response = await apiService.getVillages(districtCode, 100);
            if (response.success && response.data) {
                selector.innerHTML = '<option value="">Select a village...</option>';
                response.data.forEach(village => {
                    const option = document.createElement('option');
                    option.value = village.kode_desa_kelurahan;
                    option.textContent = village.nama_desa_kelurahan;
                    selector.appendChild(option);
                });
                selector.disabled = false;
            }
        } catch (error) {
            console.error('Error loading villages:', error);
            selector.innerHTML = '<option value="">Error loading villages</option>';
        }
    },

    clearCitySelector() {
        const selector = document.getElementById('city-selector');
        if (selector) {
            selector.innerHTML = '<option value="">Select a city/regency...</option>';
            selector.disabled = true;
        }
        this.clearDistrictSelector();
    },

    clearDistrictSelector() {
        const selector = document.getElementById('district-selector');
        if (selector) {
            selector.innerHTML = '<option value="">Select a district...</option>';
            selector.disabled = true;
        }
        this.clearVillageSelector();
    },

    clearVillageSelector() {
        const selector = document.getElementById('village-selector');
        if (selector) {
            selector.innerHTML = '<option value="">Select a village...</option>';
            selector.disabled = true;
        }
    },

    async addProvinceMarkersOnDemand() {
        // This function is now replaced by selectProvince which loads data on-demand
        // Keeping for backward compatibility but not used
    }, createProvincePopup(data) {
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
            this.clearCitySelector();
            return;
        }

        try {
            // Show loading indicator
            const infoElement = document.getElementById('province-info');
            const contentElement = document.getElementById('province-info-content');
            if (contentElement) {
                contentElement.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
            }
            if (infoElement) {
                infoElement.style.display = 'block';
            }

            // Store selected province
            selectedLocation.province = provinceCode;
            selectedLocation.city = null;
            selectedLocation.district = null;
            selectedLocation.village = null;

            const geoResponse = await apiService.getProvinceGeo(provinceCode);
            if (geoResponse.success && geoResponse.data) {
                const geoData = geoResponse.data;
                const lat = parseFloat(geoData.lat);
                const lng = parseFloat(geoData.lng);

                if (!isNaN(lat) && !isNaN(lng)) {
                    // Remove existing province layer if any
                    if (currentProvinceLayer) {
                        map.removeLayer(currentProvinceLayer);
                    }

                    // Add marker for selected province
                    currentProvinceLayer = L.marker([lat, lng]).addTo(map);
                    const popupContent = this.createProvincePopup(geoData);
                    currentProvinceLayer.bindPopup(popupContent).openPopup();

                    // Pan to province
                    map.setView([lat, lng], 8);
                    this.showProvinceInfo(geoData);

                    // Auto-show province boundary if toggle is enabled
                    const provinceBoundaryToggle = document.getElementById('province-boundary-toggle');
                    if (provinceBoundaryToggle && provinceBoundaryToggle.checked) {
                        this.showProvinceBoundary(geoData);
                    }

                    // Load cities for this province
                    await this.populateCitySelector(provinceCode);
                }
            }
        } catch (error) {
            console.error('Error selecting province:', error);
            const contentElement = document.getElementById('province-info-content');
            if (contentElement) {
                contentElement.innerHTML = '<div class="alert alert-danger alert-sm">Error loading province data</div>';
            }
        }
    },

    async selectCity(cityCode) {
        if (!cityCode) {
            // Remove city layers and clear child selectors
            if (currentCityLayer) {
                map.removeLayer(currentCityLayer);
                currentCityLayer = null;
            }
            this.clearDistrictSelector();
            selectedLocation.city = null;
            selectedLocation.district = null;
            selectedLocation.village = null;
            return;
        }

        try {
            selectedLocation.city = cityCode;
            selectedLocation.district = null;
            selectedLocation.village = null;

            const geoResponse = await apiService.getCityGeo(cityCode);
            if (geoResponse.success && geoResponse.data) {
                const geoData = geoResponse.data;
                const lat = parseFloat(geoData.lat);
                const lng = parseFloat(geoData.lng);

                if (!isNaN(lat) && !isNaN(lng)) {
                    // Remove existing city layer if any
                    if (currentCityLayer) {
                        map.removeLayer(currentCityLayer);
                    }

                    // Add marker for selected city
                    currentCityLayer = L.marker([lat, lng], {
                        icon: L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        })
                    }).addTo(map);

                    const popupContent = `
                        <div class="popup-content">
                            <h6 class="popup-title">${geoData.nama_kabupaten_kota}</h6>
                            <div class="popup-info">
                                <div class="info-row">
                                    <span class="info-label">Type:</span>
                                    <span class="info-value">${geoData.tipe || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Population:</span>
                                    <span class="info-value">${utils.formatPopulation(geoData.penduduk)}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Area:</span>
                                    <span class="info-value">${utils.formatArea(geoData.luas)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    currentCityLayer.bindPopup(popupContent).openPopup();

                    // Pan to city with higher zoom
                    map.setView([lat, lng], 10);

                    // Auto-show city boundary if toggle is enabled
                    const cityBoundaryToggle = document.getElementById('city-boundary-toggle');
                    if (cityBoundaryToggle && cityBoundaryToggle.checked) {
                        this.showCityBoundary(geoData);
                    }

                    // Load districts for this city
                    await this.populateDistrictSelector(cityCode);
                }
            }
        } catch (error) {
            console.error('Error selecting city:', error);
        }
    },

    async selectDistrict(districtCode) {
        if (!districtCode) {
            // Remove district layers and clear child selectors
            if (currentDistrictLayer) {
                map.removeLayer(currentDistrictLayer);
                currentDistrictLayer = null;
            }
            this.clearVillageSelector();
            selectedLocation.district = null;
            selectedLocation.village = null;
            return;
        }

        try {
            selectedLocation.district = districtCode;
            selectedLocation.village = null;

            // Get district detail from list endpoint
            const detailResponse = await apiService.getDistrictDetail(districtCode);
            if (detailResponse.success && detailResponse.data) {
                const districtData = detailResponse.data;

                // For districts, we'll place marker at city center with slight offset
                // since district geo endpoint is not available
                if (selectedLocation.city) {
                    const cityGeoResponse = await apiService.getCityGeo(selectedLocation.city);
                    if (cityGeoResponse.success && cityGeoResponse.data) {
                        const cityLat = parseFloat(cityGeoResponse.data.lat);
                        const cityLng = parseFloat(cityGeoResponse.data.lng);

                        // Add small random offset for district marker
                        const districtLat = cityLat + (Math.random() - 0.5) * 0.1;
                        const districtLng = cityLng + (Math.random() - 0.5) * 0.1;

                        // Remove existing district layer if any
                        if (currentDistrictLayer) {
                            map.removeLayer(currentDistrictLayer);
                        }

                        // Add marker for selected district
                        currentDistrictLayer = L.marker([districtLat, districtLng], {
                            icon: L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })
                        }).addTo(map);

                        const popupContent = `
                            <div class="popup-content">
                                <h6 class="popup-title">${districtData.nama_kecamatan}</h6>
                                <div class="popup-info">
                                    <div class="info-row">
                                        <span class="info-label">District Code:</span>
                                        <span class="info-value">${districtData.kode_kecamatan}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">City/Regency:</span>
                                        <span class="info-value">${districtData.nama_kabupaten_kota || 'N/A'}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Province:</span>
                                        <span class="info-value">${districtData.nama_provinsi || 'N/A'}</span>
                                    </div>
                                </div>
                                <small class="text-muted">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Approximate location (exact coordinates not available)
                                </small>
                            </div>
                        `;
                        currentDistrictLayer.bindPopup(popupContent).openPopup();

                        // Pan to district with higher zoom
                        map.setView([districtLat, districtLng], 12);

                        // Load villages for this district
                        await this.populateVillageSelector(districtCode);
                    }
                }
            }
        } catch (error) {
            console.error('Error selecting district:', error);
        }
    },

    async selectVillage(villageCode) {
        if (!villageCode) {
            // Remove village layer
            if (currentVillageLayer) {
                map.removeLayer(currentVillageLayer);
                currentVillageLayer = null;
            }
            selectedLocation.village = null;
            return;
        }

        try {
            selectedLocation.village = villageCode;

            // Get village detail from list endpoint
            const detailResponse = await apiService.getVillageDetail(villageCode);
            if (detailResponse.success && detailResponse.data) {
                const villageData = detailResponse.data;

                // For villages, we'll place marker near district center with slight offset
                // since village geo endpoint is not available
                if (selectedLocation.city) {
                    const cityGeoResponse = await apiService.getCityGeo(selectedLocation.city);
                    if (cityGeoResponse.success && cityGeoResponse.data) {
                        const cityLat = parseFloat(cityGeoResponse.data.lat);
                        const cityLng = parseFloat(cityGeoResponse.data.lng);

                        // Add larger random offset for village marker
                        const villageLat = cityLat + (Math.random() - 0.5) * 0.2;
                        const villageLng = cityLng + (Math.random() - 0.5) * 0.2;

                        // Remove existing village layer if any
                        if (currentVillageLayer) {
                            map.removeLayer(currentVillageLayer);
                        }

                        // Add marker for selected village
                        currentVillageLayer = L.marker([villageLat, villageLng], {
                            icon: L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })
                        }).addTo(map);

                        const popupContent = `
                            <div class="popup-content">
                                <h6 class="popup-title">${villageData.nama_desa_kelurahan}</h6>
                                <div class="popup-info">
                                    <div class="info-row">
                                        <span class="info-label">Village Code:</span>
                                        <span class="info-value">${villageData.kode_desa_kelurahan}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">District:</span>
                                        <span class="info-value">${villageData.nama_kecamatan || 'N/A'}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">City/Regency:</span>
                                        <span class="info-value">${villageData.nama_kabupaten_kota || 'N/A'}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Province:</span>
                                        <span class="info-value">${villageData.nama_provinsi || 'N/A'}</span>
                                    </div>
                                </div>
                                <small class="text-muted">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Approximate location (exact coordinates not available)
                                </small>
                            </div>
                        `;
                        currentVillageLayer.bindPopup(popupContent).openPopup();

                        // Pan to village with highest zoom
                        map.setView([villageLat, villageLng], 14);
                    }
                }
            }
        } catch (error) {
            console.error('Error selecting village:', error);
        }
    }, showProvinceInfo(data) {
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

        // Remove all current layers
        if (currentProvinceLayer) {
            map.removeLayer(currentProvinceLayer);
            currentProvinceLayer = null;
        }
        if (currentCityLayer) {
            map.removeLayer(currentCityLayer);
            currentCityLayer = null;
        }
        if (currentDistrictLayer) {
            map.removeLayer(currentDistrictLayer);
            currentDistrictLayer = null;
        }
        if (currentVillageLayer) {
            map.removeLayer(currentVillageLayer);
            currentVillageLayer = null;
        }

        // Remove boundary layers
        if (provinceBoundaryLayer) {
            map.removeLayer(provinceBoundaryLayer);
            provinceBoundaryLayer = null;
        }
        if (cityBoundaryLayer) {
            map.removeLayer(cityBoundaryLayer);
            cityBoundaryLayer = null;
        }

        // Reset selected location
        selectedLocation = {
            province: null,
            city: null,
            district: null,
            village: null
        };

        // Reset all selectors
        const provinceSelector = document.getElementById('province-select');
        const citySelector = document.getElementById('city-selector');
        const districtSelector = document.getElementById('district-selector');
        const villageSelector = document.getElementById('village-selector');

        if (provinceSelector) provinceSelector.value = '';
        if (citySelector) {
            citySelector.innerHTML = '<option value="">Select a city/regency...</option>';
            citySelector.disabled = true;
        }
        if (districtSelector) {
            districtSelector.innerHTML = '<option value="">Select a district...</option>';
            districtSelector.disabled = true;
        }
        if (villageSelector) {
            villageSelector.innerHTML = '<option value="">Select a village...</option>';
            villageSelector.disabled = true;
        }

        // Hide info panel
        const infoElement = document.getElementById('province-info');
        if (infoElement) {
            infoElement.style.display = 'none';
        }

        // Reset boundary toggles
        const provinceBoundaryToggle = document.getElementById('province-boundary-toggle');
        const cityBoundaryToggle = document.getElementById('city-boundary-toggle');
        if (provinceBoundaryToggle) provinceBoundaryToggle.checked = false;
        if (cityBoundaryToggle) cityBoundaryToggle.checked = false;
    },

    async toggleProvinceBoundary(show) {
        if (show && selectedLocation.province) {
            try {
                const geoResponse = await apiService.getProvinceGeo(selectedLocation.province);
                if (geoResponse.success && geoResponse.data && geoResponse.data.path) {
                    // Remove existing boundary
                    if (provinceBoundaryLayer) {
                        map.removeLayer(provinceBoundaryLayer);
                    }

                    // Parse path string to coordinates array
                    const pathCoordinates = JSON.parse(geoResponse.data.path);

                    // Create polygon from coordinates
                    provinceBoundaryLayer = L.polygon(pathCoordinates, {
                        color: '#ff0000',
                        weight: 2,
                        opacity: 0.8,
                        fillOpacity: 0.1,
                        fillColor: '#ff0000'
                    }).addTo(map);

                    // Fit map to boundary
                    map.fitBounds(provinceBoundaryLayer.getBounds());
                }
            } catch (error) {
                console.error('Error loading province boundary:', error);
            }
        } else {
            // Remove boundary
            if (provinceBoundaryLayer) {
                map.removeLayer(provinceBoundaryLayer);
                provinceBoundaryLayer = null;
            }
        }
    },

    async toggleCityBoundary(show) {
        if (show && selectedLocation.city) {
            try {
                const geoResponse = await apiService.getCityGeo(selectedLocation.city);
                if (geoResponse.success && geoResponse.data && geoResponse.data.path) {
                    // Remove existing boundary
                    if (cityBoundaryLayer) {
                        map.removeLayer(cityBoundaryLayer);
                    }

                    // Parse path string to coordinates array
                    const pathCoordinates = JSON.parse(geoResponse.data.path);

                    // Create polygon from coordinates
                    cityBoundaryLayer = L.polygon(pathCoordinates, {
                        color: '#0066cc',
                        weight: 2,
                        opacity: 0.8,
                        fillOpacity: 0.15,
                        fillColor: '#0066cc'
                    }).addTo(map);

                    // Fit map to boundary
                    map.fitBounds(cityBoundaryLayer.getBounds());
                }
            } catch (error) {
                console.error('Error loading city boundary:', error);
            }
        } else {
            // Remove boundary
            if (cityBoundaryLayer) {
                map.removeLayer(cityBoundaryLayer);
                cityBoundaryLayer = null;
            }
        }
    },

    showProvinceBoundary(geoData) {
        try {
            if (geoData && geoData.path) {
                // Remove existing boundary
                if (provinceBoundaryLayer) {
                    map.removeLayer(provinceBoundaryLayer);
                }

                // Parse path string to coordinates array
                const pathCoordinates = JSON.parse(geoData.path);

                // Create polygon from coordinates
                provinceBoundaryLayer = L.polygon(pathCoordinates, {
                    color: '#ff0000',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.1,
                    fillColor: '#ff0000'
                }).addTo(map);
            }
        } catch (error) {
            console.error('Error showing province boundary:', error);
        }
    },

    showCityBoundary(geoData) {
        try {
            if (geoData && geoData.path) {
                // Remove existing boundary
                if (cityBoundaryLayer) {
                    map.removeLayer(cityBoundaryLayer);
                }

                // Parse path string to coordinates array
                const pathCoordinates = JSON.parse(geoData.path);

                // Create polygon from coordinates
                cityBoundaryLayer = L.polygon(pathCoordinates, {
                    color: '#0066cc',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.15,
                    fillColor: '#0066cc'
                }).addTo(map);
            }
        } catch (error) {
            console.error('Error showing city boundary:', error);
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
        } if (tryButton) {
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
            const data = await apiService.fetchData(endpoint);            // Show success response
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
    isInitialized: false,

    init() {
        if (this.isInitialized) return; // Prevent double initialization

        this.loadProvincesTable();
        this.loadCharts();
        this.initTableSearch();
        this.isInitialized = true;
    },

    async loadProvincesTable() {
        try {
            utils.showLoading('provinces-table-body');

            const response = await apiService.getProvinces();
            if (response.success && response.data) {
                // Show basic table first without geo data
                this.renderBasicProvincesTable(response.data);

                // Load detailed data progressively in background
                this.loadDetailedProvinceData(response.data);
            }
        } catch (error) {
            utils.showError('provinces-table-body', 'Failed to load provinces data');
        }
    },

    renderBasicProvincesTable(data) {
        const tbody = document.getElementById('provinces-table-body');
        if (!tbody) return;

        tbody.innerHTML = data.map(province => {
            return `
                <tr data-province-code="${province.kode_provinsi}">
                    <td><span class="badge bg-primary">${province.kode_provinsi}</span></td>
                    <td><strong>${province.nama_provinsi}</strong></td>
                    <td><span class="text-muted">Loading...</span></td>
                    <td><span class="text-muted">Loading...</span></td>
                    <td><span class="text-muted">Loading...</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="mapManager.selectProvince('${province.kode_provinsi}')">
                            <i class="fas fa-map-marker-alt me-1"></i>View on Map
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async loadDetailedProvinceData(provinces) {
        // Load data for a few provinces at a time to avoid overwhelming the API
        const batchSize = 5;
        const tbody = document.getElementById('provinces-table-body');

        for (let i = 0; i < provinces.length; i += batchSize) {
            const batch = provinces.slice(i, i + batchSize);

            await Promise.all(batch.map(async (province) => {
                try {
                    const geoResponse = await apiService.getProvinceGeo(province.kode_provinsi);
                    if (geoResponse.success && geoResponse.data) {
                        // Update the specific row with detailed data
                        const row = tbody.querySelector(`tr[data-province-code="${province.kode_provinsi}"]`);
                        if (row) {
                            const geo = geoResponse.data;
                            row.cells[2].innerHTML = geo.ibukota || 'N/A';
                            row.cells[3].innerHTML = utils.formatPopulation(geo.penduduk);
                            row.cells[4].innerHTML = utils.formatArea(geo.luas);
                        }
                    }
                } catch (error) {
                    // Update row with error state
                    const row = tbody.querySelector(`tr[data-province-code="${province.kode_provinsi}"]`);
                    if (row) {
                        row.cells[2].innerHTML = 'N/A';
                        row.cells[3].innerHTML = 'N/A';
                        row.cells[4].innerHTML = 'N/A';
                    }
                }
            }));

            // Small delay between batches to be nice to the server
            if (i + batchSize < provinces.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }, renderProvincesTable(data) {
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
    // Initialize core components immediately
    if (document.getElementById('indonesia-map')) {
        mapManager.init();
    }

    demoManager.init();

    // Initialize visualization with lazy loading
    const visualizationSection = document.getElementById('visualization');
    if (visualizationSection) {
        // Use Intersection Observer to load visualization when section comes into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    visualizationManager.init();
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '100px'
        });
        observer.observe(visualizationSection);
    } else {
        // Fallback if section not found
        visualizationManager.init();
    }

    // Province selector change
    const provinceSelector = document.getElementById('province-selector');
    if (provinceSelector) {
        provinceSelector.addEventListener('change', (e) => {
            mapManager.selectProvince(e.target.value);
        });
    }

    // City selector change
    const citySelector = document.getElementById('city-selector');
    if (citySelector) {
        citySelector.addEventListener('change', (e) => {
            mapManager.selectCity(e.target.value);
        });
    }

    // District selector change
    const districtSelector = document.getElementById('district-selector');
    if (districtSelector) {
        districtSelector.addEventListener('change', (e) => {
            mapManager.selectDistrict(e.target.value);
        });
    }

    // Village selector change
    const villageSelector = document.getElementById('village-selector');
    if (villageSelector) {
        villageSelector.addEventListener('change', (e) => {
            mapManager.selectVillage(e.target.value);
        });
    }

    // Province boundary toggle
    const provinceBoundaryToggle = document.getElementById('province-boundary-toggle');
    if (provinceBoundaryToggle) {
        provinceBoundaryToggle.addEventListener('change', (e) => {
            mapManager.toggleProvinceBoundary(e.target.checked);
        });
    }

    // City boundary toggle
    const cityBoundaryToggle = document.getElementById('city-boundary-toggle');
    if (cityBoundaryToggle) {
        cityBoundaryToggle.addEventListener('change', (e) => {
            mapManager.toggleCityBoundary(e.target.checked);
        });
    }

    // Reset map button
    const resetMapButton = document.getElementById('reset-map');
    if (resetMapButton) {
        resetMapButton.addEventListener('click', () => {
            mapManager.resetMap();
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