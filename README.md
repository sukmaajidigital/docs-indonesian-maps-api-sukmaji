# Indonesian Maps API Documentation

This repository contains the complete documentation website for the Indonesian Maps API - a comprehensive RESTful API for Indonesian geographical and administrative data.

## 🌟 Features

- **Complete API Documentation**: Detailed information about all 16 endpoints
- **Interactive Demo**: Test API endpoints directly from the browser
- **Interactive Map**: Explore Indonesian provinces with OpenStreetMap integration
- **Data Visualization**: Charts and tables showing population and area statistics
- **Responsive Design**: Mobile-first design that works on all devices
- **Search Functionality**: Filter and search through provinces data
- **Real-time Data**: Live data from the Indonesian Maps API

## 🚀 Live Demo

Visit the live documentation: [https://sukmaajidigital.github.io/docs-indonesian-maps-api-sukmaji/](https://sukmaajidigital.github.io/docs-indonesian-maps-api-sukmaji/)

## 📋 API Information

- **Base URL**: `https://api.sukmaaji.my.id/indonesian-maps`
- **Response Format**: JSON
- **Authentication**: None required
- **Rate Limiting**: No limits

## 🗺️ Available Data

- **38 Provinces** with complete geographical data
- **501+ Cities/Regencies** with demographic information
- **17,000+ Islands** across Indonesia
- **Districts and Villages** data
- Population, area, and coordinate information

## 🛠️ Technologies Used

- **HTML5**: Semantic markup and accessibility features
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript**: Vanilla JS for all interactions
- **Leaflet.js**: Interactive maps with OpenStreetMap
- **Chart.js**: Data visualization and charts
- **Bootstrap 5**: Responsive grid and components
- **Prism.js**: Syntax highlighting for code examples

## 📁 Project Structure

```
docs-indonesian-maps-api-sukmaji/
├── index.html              # Main documentation page
├── styles.css              # Custom CSS styles
├── script.js               # JavaScript functionality
├── README.md               # Project documentation
├── docs/                   # API response examples
│   ├── response.json
│   ├── Indonesian_Maps_API.postman_collection.json
│   └── Indonesian_Maps_API.postman_environment.json
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions deployment
```

## 🚀 Local Development

1. **Clone the repository**:

   ```bash
   git clone https://github.com/sukmaajidigital/docs-indonesian-maps-api-sukmaji.git
   cd docs-indonesian-maps-api-sukmaji
   ```

2. **Serve locally**:

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .

   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8000`

## 🌍 API Endpoints

### Provinces (Provinsi)

- `GET /provinsi` - Get all provinces
- `GET /provinsi/{code}` - Get province detail
- `GET /provinsi/{code}/geo` - Get province geographical data
- `GET /provinsi/complete` - Get complete province data with geo info

### Cities/Regencies (Kabupaten/Kota)

- `GET /kabupaten-kota` - Get all cities/regencies
- `GET /kabupaten-kota/{code}` - Get city/regency detail
- `GET /kabupaten-kota/{code}/geo` - Get geographical data
- `GET /kabupaten-kota/complete` - Get complete data

### Districts (Kecamatan)

- `GET /kecamatan` - Get all districts
- `GET /kecamatan/{code}` - Get district detail

### Villages (Desa/Kelurahan)

- `GET /desa-kelurahan` - Get all villages
- `GET /desa-kelurahan/{code}` - Get village detail

### Islands (Pulau)

- `GET /pulau` - Get all islands
- `GET /pulau/{id}` - Get island detail

### Utility

- `GET /` - API information
- `GET /test` - API connectivity test

## 📖 Query Parameters

All list endpoints support:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 1000)
- `search`: Search by name (case insensitive)
- Hierarchical filtering by administrative codes

## 🎨 Features

### Interactive Map

- OpenStreetMap integration with Leaflet.js
- Province markers with detailed popups
- Map layer switching (OSM, Satellite, Terrain)
- Responsive design for mobile devices
- Province selection with automatic map navigation

### Data Visualization

- Population distribution charts (doughnut chart)
- Area comparison charts (bar chart)
- Interactive data tables with search
- Real-time data from the API

### Live Demo

- Test all API endpoints directly
- Syntax-highlighted JSON responses
- Error handling and status indicators
- Copy-paste ready API calls

## 🔧 Configuration

The website can be configured by modifying the `CONFIG` object in `script.js`:

```javascript
const CONFIG = {
  API_BASE_URL: "https://api.sukmaaji.my.id/indonesian-maps",
  DEFAULT_COORDINATE: [-6.2088, 106.8456], // Jakarta
  DEFAULT_ZOOM: 5,
  INDONESIA_BOUNDS: [
    [-11, 95],
    [6, 141],
  ],
};
```

## 📱 Mobile Support

The documentation is fully responsive and includes:

- Mobile-first CSS design
- Touch-friendly map controls
- Collapsible navigation menu
- Optimized charts for small screens
- Accessible form controls

## ♿ Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode support
- Focus indicators for all interactive elements

## 🚀 Deployment

### GitHub Pages (Recommended)

1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Select source as "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Your site will be available at `https://yourusername.github.io/docs-indonesian-maps-api-sukmaji/`

### Manual Deployment

1. Build the project (no build step required for static site)
2. Upload all files to your web server
3. Ensure proper MIME types for `.json` files
4. Configure HTTPS for better security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **API Issues**: Contact the API team at [https://sukmaaji.my.id](https://sukmaaji.my.id)
- **Documentation Issues**: Open an issue in this repository
- **General Questions**: Reach out via [Instagram](https://instagram.com/sukmaaji.digital)

## 🏗️ Built With

- [Leaflet.js](https://leafletjs.com/) - Interactive maps
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [Bootstrap](https://getbootstrap.com/) - UI framework
- [Prism.js](https://prismjs.com/) - Syntax highlighting
- [Font Awesome](https://fontawesome.com/) - Icons

## 👨‍💻 Author

**Sukma Aji Digital**

- Website: [sukmaaji.my.id](https://sukmaaji.my.id)
- Instagram: [@sukmaaji.digital](https://instagram.com/sukmaaji.digital)
- GitHub: [@sukmaajidigital](https://github.com/sukmaajidigital)

## 🎯 Roadmap

- [ ] Add GeoJSON boundaries for provinces
- [ ] Implement district-level mapping
- [ ] Add more chart types and visualizations
- [ ] Create API usage analytics dashboard
- [ ] Add multi-language support
- [ ] Implement progressive web app features

---

⭐ Star this repository if you find it useful!
