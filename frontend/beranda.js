class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('devhub_token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('devhub_token', token);
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('devhub_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Terjadi kesalahan');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth methods
    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: userData
        });
    }

    async login(credentials) {
        const data = await this.request('/login', {
            method: 'POST',
            body: credentials
        });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    // Developer methods
    async getAllDevelopers() {
        return this.request('/developers');
    }

    async saveDeveloperProfile(profileData) {
        return this.request('/developer/profile', {
            method: 'POST',
            body: profileData
        });
    }

    // Project methods
    async addProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: projectData
        });
    }

    async deleteProject(projectId) {
        return this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    async updateProject(projectId, projectData) {
        return this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: projectData
        });
    }

    async autoCreateDeveloperProfile(profileData) {
        return this.request('/auto-create-developer', {
            method: 'POST',
            body: profileData
        });
    }
}

    //INISIALISASI apiService
    const apiService = new ApiService();
        // User Management
        let currentUser = null;
        let users = JSON.parse(localStorage.getItem('devhub_users')) || [];
        let developers = JSON.parse(localStorage.getItem('devhub_developers')) || [];

        // Sample data for demonstration
        const sampleDevelopers = [
            {
                userId: "sample1",
                name: "Alex Johnson",
                title: "Full Stack Developer",
                bio: "Spesialis dalam pengembangan aplikasi web dengan React dan Node.js. Memiliki pengalaman lebih dari 5 tahun dalam membangun solusi digital yang scalable dan efisien.",
                location: "Jakarta, Indonesia",
                experience: "5+ Tahun",
                email: "alex.johnson@devhub.com",
                phone: "+62 812 3456 7891",
                github: "https://github.com/alexjohnson",
                linkedin: "https://linkedin.com/in/alexjohnson",
                skills: ["React", "Node.js", "MongoDB", "JavaScript", "Express", "TypeScript", "AWS", "Docker"],
                projects: [
                    {
                        name: "E-Commerce Platform",
                        description: "Platform e-commerce dengan fitur pembayaran terintegrasi dan dashboard analitik",
                        demo: "#",
                        code: "#",
                        technologies: ["React", "Node.js", "MongoDB"]
                    },
                    {
                        name: "SaaS Dashboard",
                        description: "Dashboard analitik real-time untuk platform SaaS dengan visualisasi data",
                        demo: "#",
                        code: "#",
                        technologies: ["React", "TypeScript", "Chart.js"]
                    }
                ]
            },
            {
                userId: "sample2",
                name: "Sarah Miller",
                title: "Frontend Developer",
                bio: "Ahli dalam membangun UI/UX yang menarik dan responsif dengan Vue.js dan React. Fokus pada pengalaman pengguna yang optimal dan performa aplikasi yang tinggi.",
                location: "Bandung, Indonesia",
                experience: "4+ Tahun",
                email: "sarah.miller@devhub.com",
                phone: "+62 812 3456 7892",
                github: "https://github.com/sarahmiller",
                linkedin: "https://linkedin.com/in/sarahmiller",
                skills: ["Vue.js", "React", "CSS3", "TypeScript", "SASS", "Webpack", "Jest", "GraphQL"],
                projects: [
                    {
                        name: "Admin Dashboard",
                        description: "Dashboard admin dengan komponen reusable dan dark mode support",
                        demo: "#",
                        code: "#",
                        technologies: ["Vue.js", "TypeScript", "SCSS"]
                    },
                    {
                        name: "E-Learning Platform",
                        description: "Platform pembelajaran online dengan video player dan progress tracking",
                        demo: "#",
                        code: "#",
                        technologies: ["React", "Redux", "WebRTC"]
                    }
                ]
            }
        ];

        // Initialize with sample data if no developers exist
        if (developers.length === 0) {
            developers = sampleDevelopers;
            localStorage.setItem('devhub_developers', JSON.stringify(developers));
        }

        // DOM Elements
        const authSection = document.getElementById('authSection');
        const authModal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authTabs = document.querySelectorAll('.auth-tab');

        // Initialize
        async function init() {
            updateAuthUI();
            await loadDevelopers();
            await loadAllDevelopers();
            setupEventListeners();
            setupSmoothScroll();
            setupNavbarScroll();
            setupDataUpdateListener();
        }

        // Update authentication UI based on login status
        function updateAuthUI() {
            const savedUser = localStorage.getItem('devhub_current_user');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
            }

            if (currentUser) {
                authSection.innerHTML = `
                    <div class="user-menu">
                        <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
                        <span class="user-name">${currentUser.name}</span>
                        <a href="develop.html" class="dashboard-btn">Dashboard</a>
                        <button class="logout-btn" id="logoutBtn">Keluar</button>
                    </div>
                `;
                document.getElementById('joinAsDeveloper').style.display = 'none';
                
                // Add logout event listener
                document.getElementById('logoutBtn').addEventListener('click', logout);
            } else {
                authSection.innerHTML = `
                    <div class="auth-buttons">
                        <a href="#" class="auth-btn login" id="loginBtn">Masuk</a>
                        <a href="#" class="auth-btn register" id="registerBtn">Daftar</a>
                    </div>
                `;
                document.getElementById('joinAsDeveloper').style.display = 'inline-block';
            }
        }

        // Setup event listeners
        function setupEventListeners() {
            // Auth modal triggers
            document.addEventListener('click', function(e) {
                if (e.target.id === 'loginBtn' || e.target.id === 'registerBtn' || e.target.id === 'joinAsDeveloper') {
                    e.preventDefault();
                    showAuthModal();
                }
            });

            // Auth tabs
            authTabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    switchAuthTab(tabName);
                });
            });

            // Auth forms
            loginForm.addEventListener('submit', handleLogin);
            registerForm.addEventListener('submit', handleRegister);

            // Close modal when clicking outside
            authModal.addEventListener('click', function(e) {
                if (e.target === authModal) {
                    hideAuthModal();
                }
            });

            // Filter functionality
            initFilters();
        }

        // Setup smooth scroll functionality
        function setupSmoothScroll() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    
                    if (targetElement) {
                        const headerHeight = document.getElementById('header').offsetHeight;
                        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                        
                        // Update active nav link
                        updateActiveNavLink(targetId);
                    }
                });
            });
        }

        // Setup navbar scroll effect and active section tracking
        function setupNavbarScroll() {
            const header = document.getElementById('header');
            const sections = document.querySelectorAll('section[id]');
            const navLinks = document.querySelectorAll('.nav-link');
            
            // Scroll effect for header
            window.addEventListener('scroll', function() {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
                
                // Update active nav link based on scroll position
                let current = '';
                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionHeight = section.clientHeight;
                    const headerHeight = header.offsetHeight;
                    
                    if (window.scrollY >= (sectionTop - headerHeight - 100)) {
                        current = section.getAttribute('id');
                    }
                });
                
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${current}`) {
                        link.classList.add('active');
                    }
                });
            });
        }

        // Update active nav link
        function updateActiveNavLink(targetId) {
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === targetId) {
                    link.classList.add('active');
                }
            });
        }

        // Auth modal functions
        function showAuthModal() {
            authModal.style.display = 'block';
        }

        function hideAuthModal() {
            authModal.style.display = 'none';
        }

        function switchAuthTab(tabName) {
            authTabs.forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
            });

            if (tabName === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        }

        // Auth handlers
        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const result = await apiService.login({ email, password });
                currentUser = result.user;
                
                // Simpan user ke localStorage
                localStorage.setItem('devhub_current_user', JSON.stringify(currentUser));
                
                updateAuthUI();
                hideAuthModal();
                showNotification('Login berhasil!', 'success');
                
                // Redirect ke develop.html setelah login berhasil
                setTimeout(() => {
                    window.location.href = 'develop.html';
                }, 1000);
                
            } catch (error) {
                showNotification(error.message, 'error');
            }
        }

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('Password tidak cocok!', 'error');
        return;
    }

    try {
        const result = await apiService.register({ name, email, password });
        currentUser = result.user;
        
        // Simpan user ke localStorage
        localStorage.setItem('devhub_current_user', JSON.stringify(currentUser));
        
        //OTOMATIS BUAT PROFIL DEVELOPER SETELAH REGISTRASI
        try {
            await apiService.autoCreateDeveloperProfile({
                userId: currentUser.id,
                name: currentUser.name,
                email: currentUser.email
            });
            console.log('Developer profile created automatically after registration');
        } catch (devError) {
            console.log('Auto-create developer profile failed (non-critical):', devError);
            // Lanjutkan meskipun gagal, user bisa buat manual nanti
        }
        
        updateAuthUI();
        hideAuthModal();
        showNotification('Registrasi berhasil! Profil developer telah dibuat.', 'success');
        
        // Redirect ke develop.html setelah registrasi berhasil
        setTimeout(() => {
            window.location.href = 'develop.html';
        }, 1500);
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

        function logout() {
            currentUser = null;
            localStorage.removeItem('devhub_current_user');
            apiService.removeToken();
            updateAuthUI();
            showNotification('Anda telah logout', 'info');
        }

        // Load featured developers
async function loadDevelopers() {
    const developersGrid = document.getElementById('developersGrid');
    developersGrid.innerHTML = '<div class="loading">Memuat developer...</div>';
    
    try {
        console.log('Loading featured developers...');
        const developers = await apiService.getAllDevelopers();
        
        console.log('Developers loaded:', developers.length);
        developers.forEach(dev => {
            console.log('   -', dev.name, '|', dev.title);
        });
        
        // Show first 3 developers as featured
        const featuredDevelopers = developers.slice(0, 3);
        
        developersGrid.innerHTML = '';
        
        if (featuredDevelopers.length === 0) {
            developersGrid.innerHTML = `
                <div class="error" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 20px; color: var(--text-muted);"></i>
                    <h3>Belum ada developer</h3>
                    <p>Belum ada developer yang terdaftar. Jadilah yang pertama!</p>
                </div>
            `;
            return;
        }
        
        featuredDevelopers.forEach(developer => {
            const developerCard = createDeveloperCard(developer);
            developersGrid.appendChild(developerCard);
        });
        
        console.log('Featured developers loaded:', featuredDevelopers.length);
        
    } catch (error) {
        console.error('Error loading developers:', error);
        developersGrid.innerHTML = `
            <div class="error" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                Gagal memuat developer: ${error.message}
            </div>
        `;
    }
}

// Load all developers
async function loadAllDevelopers() {
    const allDevelopersGrid = document.getElementById('allDevelopersGrid');
    allDevelopersGrid.innerHTML = '<div class="loading">Memuat semua developer...</div>';
    
    try {
        console.log('Loading all developers...');
        const developers = await apiService.getAllDevelopers();
        
        console.log('All developers loaded:', developers.length);
        
        allDevelopersGrid.innerHTML = '';
        
        if (developers.length === 0) {
            allDevelopersGrid.innerHTML = `
                <div class="error" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                    <i class="fas fa-users" style="font-size: 4rem; margin-bottom: 20px; color: var(--text-muted);"></i>
                    <h3>Belum Ada Developer</h3>
                    <p>Belum ada developer yang terdaftar di platform.</p>
                    <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted);">
                        <a href="#" id="joinAsDeveloperTop" style="color: var(--primary-color);">Daftar sebagai developer</a> untuk menjadi yang pertama!
                    </p>
                </div>
            `;
            
            // Add event listener untuk join button
            document.getElementById('joinAsDeveloperTop').addEventListener('click', function(e) {
                e.preventDefault();
                showAuthModal();
            });
            
            updateStats(developers);
            return;
        }
        
        developers.forEach(developer => {
            const developerCard = createDeveloperCard(developer);
            allDevelopersGrid.appendChild(developerCard);
        });
        
        updateStats(developers);
        console.log('All developers loaded:', developers.length);
        
    } catch (error) {
        console.error('Error loading all developers:', error);
        allDevelopersGrid.innerHTML = `
            <div class="error" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                Gagal memuat developer: ${error.message}
            </div>
        `;
    }
}

// Create developer card
function createDeveloperCard(developer) {
    const card = document.createElement('div');
    card.className = 'developer-card';
    card.setAttribute('data-category', 'fullstack');
    
    console.log('Creating card for:', developer.name);
    
    // GUNAKAN GAMBAR ANONIM DEFAULT JIKA TIDAK ADA FOTO 
    let profileImage;
    if (developer.profile_picture_url) {
        profileImage = developer.profile_picture_url + '?t=' + Date.now();
    } else if (developer.profile_picture) {
        profileImage = `http://localhost:5000/uploads/profiles/${developer.profile_picture}?t=${Date.now()}`;
    } else {
        //GAMBAR ANONIM DEFAULT UNTUK CARD
        profileImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 24 24' fill='none' stroke='%236c63ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
    }
    
    // Handle data yang mungkin tidak lengkap
    const devName = developer.name || 'Developer';
    const devTitle = developer.title || 'Developer';
    const devBio = developer.bio ? developer.bio.substring(0, 100) + '...' : 'Developer berpengalaman di bidang IT.';
    const devSkills = developer.skills && developer.skills.length > 0 
        ? developer.skills.slice(0, 4) 
        : ['JavaScript', 'HTML', 'CSS'];
    
    card.innerHTML = `
        <div class="developer-image">
            <img src="${profileImage}" 
                 alt="${devName}"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236c63ff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\'%3E%3C/path%3E%3Ccircle cx=\'12\' cy=\'7\' r=\'4\'%3E%3C/circle%3E%3C/svg%3E'">
        </div>
        <div class="developer-info">
            <h3>${devName}</h3>
            <div class="developer-title">${devTitle}</div>
            <p>${devBio}</p>
            <div class="developer-skills">
                ${devSkills.map(skill => `<div class="skill">${skill}</div>`).join('')}
            </div>
            <div class="developer-links">
                <a href="#" class="view-details">Lihat Profil</a>
                ${developer.github_url ? `<a href="${developer.github_url}" target="_blank"><i class="fab fa-github"></i></a>` : ''}
                ${developer.linkedin_url ? `<a href="${developer.linkedin_url}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
            </div>
        </div>
    `;
    
    const viewDetailsBtn = card.querySelector('.view-details');
    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Lihat Profil clicked for:', developer.name);
            showDeveloperDetail(developer);
        });
    }
    
    return card;
}

        // Filter developers
        function filterDevelopers(category, searchTerm = '') {
            const allDevelopers = document.querySelectorAll('#allDevelopersGrid .developer-card');
            
            allDevelopers.forEach(card => {
                const developerName = card.querySelector('h3').textContent.toLowerCase();
                const developerSkills = card.querySelector('.developer-skills').textContent.toLowerCase();
                const developerTitle = card.querySelector('.developer-title').textContent.toLowerCase();
                
                const categoryMatch = category === 'all' || developerTitle.includes(category);
                const searchMatch = searchTerm === '' || 
                    developerName.includes(searchTerm.toLowerCase()) || 
                    developerSkills.includes(searchTerm.toLowerCase()) ||
                    developerTitle.includes(searchTerm.toLowerCase());
                
                if (categoryMatch && searchMatch) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Initialize filter functionality
        function initFilters() {
            const filterButtons = document.querySelectorAll('.filter-btn');
            const searchInput = document.getElementById('developerSearch');
            
            filterButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all buttons
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');
                    
                    const category = this.getAttribute('data-category');
                    const searchTerm = searchInput.value;
                    filterDevelopers(category, searchTerm);
                });
            });
            
            searchInput.addEventListener('input', function() {
                const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-category');
                const searchTerm = this.value;
                filterDevelopers(activeCategory, searchTerm);
            });
        }

// Update statistics
function updateStats(developers) {
    const totalDevelopers = developers.length;
    const totalProjects = developers.reduce((acc, dev) => acc + (dev.projects ? dev.projects.length : 0), 0);
    const allSkills = developers.flatMap(dev => dev.skills || []);
    const uniqueTechnologies = [...new Set(allSkills)];
    
    console.log('Stats update:', {
        totalDevelopers,
        totalProjects,
        uniqueTechnologies: uniqueTechnologies.length
    });
    
    document.getElementById('totalDevelopers').textContent = totalDevelopers;
    document.getElementById('availableDevelopers').textContent = totalDevelopers;
    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('totalTechnologies').textContent = uniqueTechnologies.length;
}

        // Developer Detail Modal
        const developerDetailModal = document.getElementById('developerDetailModal');
        const backButton = document.getElementById('backButton');

 //FUNCTION showDeveloperDetail - GAMBAR PROFIL
function showDeveloperDetail(developer) {
    console.log('Showing developer detail:', developer);
    
    if (!developer) {
        console.error('No developer data provided');
        return;
    }

    // Sembunyikan semua section utama
    const sections = document.querySelectorAll('section');
    const footer = document.querySelector('footer');
    const header = document.getElementById('header');
    
    sections.forEach(section => {
        section.style.display = 'none';
    });
    if (footer) footer.style.display = 'none';
    if (header) header.style.display = 'none';
    
    // Populate modal dengan data developer
    try {
        // Basic info
        document.getElementById('detailName').textContent = developer.name || 'Nama tidak tersedia';
        document.getElementById('detailTitle').textContent = developer.title || 'Developer';
        document.getElementById('detailDescription').textContent = developer.bio || 'Tidak ada deskripsi';
        document.getElementById('detailExperience').textContent = developer.experience ? developer.experience + ' tahun' : 'Tidak tersedia';
        document.getElementById('detailLocation').textContent = developer.location || 'Tidak tersedia';
        document.getElementById('detailEmail').textContent = developer.email || 'Tidak tersedia';
        document.getElementById('detailPhone').textContent = developer.phone || 'Tidak tersedia';
        
        //BAGIAN GAMBAR PROFIL
    const detailImage = document.getElementById('detailImage');
    console.log('Setting detail image for:', developer.name);
    
    let profileImageUrl;
    if (developer.profile_picture_url) {
        profileImageUrl = developer.profile_picture_url + '?t=' + Date.now();
    } else if (developer.profile_picture) {
        profileImageUrl = `http://localhost:5000/uploads/profiles/${developer.profile_picture}?t=${Date.now()}`;
    } else {
        //GAMBAR ANONIM DEFAULT UNTUK DETAIL
        profileImageUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 24 24' fill='none' stroke='%236c63ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
    }
    
    console.log('Final detail image URL:', profileImageUrl);
    detailImage.src = profileImageUrl;
    detailImage.alt = developer.name || 'Developer';
    
    // Handle image load errors - fallback ke anonim
    detailImage.onerror = function() {
        console.error('Failed to load detail image:', this.src);
        this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 24 24' fill='none' stroke='%236c63ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
    };
        
        // Social links
        const githubLink = document.getElementById('detailGithub');
        const linkedinLink = document.getElementById('detailLinkedin');
        
        if (githubLink) {
            githubLink.href = developer.github_url || developer.github || '#';
            githubLink.target = '_blank';
            if (!developer.github_url && !developer.github) {
                githubLink.style.display = 'none';
            } else {
                githubLink.style.display = 'inline-block';
            }
        }
        
        if (linkedinLink) {
            linkedinLink.href = developer.linkedin_url || developer.linkedin || '#';
            linkedinLink.target = '_blank';
            if (!developer.linkedin_url && !developer.linkedin) {
                linkedinLink.style.display = 'none';
            } else {
                linkedinLink.style.display = 'inline-block';
            }
        }
        
        // Skills
        const skillsContainer = document.getElementById('detailSkills');
        if (skillsContainer) {
            skillsContainer.innerHTML = '';
            if (developer.skills && developer.skills.length > 0) {
                developer.skills.forEach(skill => {
                    const span = document.createElement('span');
                    span.className = 'skill';
                    span.textContent = skill;
                    skillsContainer.appendChild(span);
                });
            } else {
                skillsContainer.innerHTML = '<span class="skill">Tidak ada keahlian yang tercantum</span>';
            }
        }
        
        // Projects
        const projectsContainer = document.getElementById('detailProjects');
        if (projectsContainer) {
            projectsContainer.innerHTML = '';
            if (developer.projects && developer.projects.length > 0) {
                developer.projects.forEach(project => {
                    const projectDiv = document.createElement('div');
                    projectDiv.className = 'project-item';
                    
                    // Handle technologies (bisa array atau string)
                    let technologiesHtml = '';
                    if (Array.isArray(project.technologies)) {
                        technologiesHtml = project.technologies.map(tech => `<span class="skill">${tech}</span>`).join('');
                    } else if (project.technologies) {
                        technologiesHtml = `<span class="skill">${project.technologies}</span>`;
                    } else {
                        technologiesHtml = '<span class="skill">Tidak ada teknologi yang dicantumkan</span>';
                    }
                    
                    projectDiv.innerHTML = `
                        <h4>${project.name || 'Project Tanpa Nama'}</h4>
                        <p>${project.description || 'Tidak ada deskripsi'}</p>
                        <div class="project-technologies">
                            ${technologiesHtml}
                        </div>
                        <div class="project-links">
                            ${(project.demo_url || project.demo) ? `<a href="${project.demo_url || project.demo}" target="_blank"><i class="fas fa-external-link-alt"></i> Demo</a>` : ''}
                            ${(project.code_url || project.code) ? `<a href="${project.code_url || project.code}" target="_blank"><i class="fab fa-github"></i> Code</a>` : ''}
                        </div>
                    `;
                    
                    projectsContainer.appendChild(projectDiv);
                });
            } else {
                projectsContainer.innerHTML = '<div class="project-item"><p>Belum ada project yang ditambahkan</p></div>';
            }
        }
        
        // Tampilkan modal
        const developerDetailModal = document.getElementById('developerDetailModal');
        if (developerDetailModal) {
            developerDetailModal.style.display = 'block';
            console.log('Developer detail modal shown');
        } else {
            console.error('Developer detail modal element not found');
        }
        
    } catch (error) {
        console.error('Error showing developer detail:', error);
        alert('Terjadi kesalahan saat menampilkan profil developer');
    }
}
        // Back button functionality
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            hideDeveloperDetail();
        });

        function hideDeveloperDetail() {
            // Show main content
            document.querySelectorAll('section, footer').forEach(el => {
                el.style.display = 'block';
            });
            document.getElementById('header').style.display = 'block';
            
            // Hide modal
            developerDetailModal.style.display = 'none';
        }

        function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }

        // Check if user is already logged in
        const savedUser = localStorage.getItem('devhub_current_user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
        }

        // Initialize the application
        init();

        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = themeToggle.querySelector('i');
        
        // Check theme preference from localStorage
        const savedTheme = localStorage.getItem('theme') || 'dark-mode';
        document.body.className = savedTheme;
        updateThemeIcon(savedTheme);
        
        themeToggle.addEventListener('click', function() {
            // Toggle between dark-mode and light-mode
            if (document.body.classList.contains('dark-mode')) {
                document.body.classList.replace('dark-mode', 'light-mode');
                localStorage.setItem('theme', 'light-mode');
            } else {
                document.body.classList.replace('light-mode', 'dark-mode');
                localStorage.setItem('theme', 'dark-mode');
            }
            
            updateThemeIcon(document.body.className);
        });
        
        function updateThemeIcon(theme) {
            if (theme === 'light-mode') {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            } else {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
        }

        // Mobile Menu Toggle
        const mobileMenu = document.getElementById('mobileMenu');
        const navLinks = document.querySelector('.nav-links');
        
        mobileMenu.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            
            if (navLinks.classList.contains('active')) {
                mobileMenu.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                mobileMenu.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Contact Form Submission
        const contactForm = document.getElementById('contactForm');
        
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            // In a real application, you would send this data to a server
            console.log('Form submitted:', { name, email, subject, message });
            
            // Show success message
            showNotification('Pesan Anda telah berhasil dikirim! Kami akan membalasnya segera.', 'success');
            
            // Reset form
            contactForm.reset();
        });

        //EVENT LISTENER UNTUK DATA UPDATE
function setupDataUpdateListener() {
    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', function(e) {
        if (e.key === 'devhub_data_updated') {
            console.log('Data update detected from other tab, reloading...');
            loadDevelopers();
            loadAllDevelopers();
        }
    });

    // Listen for custom events (from same tab)
    window.addEventListener('devhubDataUpdated', function() {
        console.log('Data update event received, reloading...');
        loadDevelopers();
        loadAllDevelopers();
    });

    // Auto-reload setiap 5 detik untuk testing (bisa di-disable nanti)
    /*setInterval(() => {
        console.log('Auto-reload check...');
        loadDevelopers();
        loadAllDevelopers();
    }, 5000);*/
}