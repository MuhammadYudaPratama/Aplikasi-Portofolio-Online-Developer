        // API Service Class
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

            async getDeveloperByUserId(userId) {
                return this.request(`/developer/${userId}`);
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

        // Inisialisasi apiService
        const apiService = new ApiService();

        // User Management
        let currentUser = null;

        // DOM Elements
        const authSection = document.getElementById('authSection');
        const dashboard = document.getElementById('dashboard');
        const dashboardTabs = document.querySelectorAll('.dashboard-tab');
        const dashboardContents = document.querySelectorAll('.dashboard-content');
        const editProjectModal = document.getElementById('editProjectModal');
        const editProjectForm = document.getElementById('editProjectForm');
        const cancelEditBtn = document.getElementById('cancelEdit');

        // Initialize
        function init() {
            console.log('Initializing application...');
            
            // Cek apakah user sudah login
            const savedUser = localStorage.getItem('devhub_current_user');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                updateAuthUI();
                loadUserData();
            } else {
                // Redirect ke beranda jika belum login
                window.location.href = 'beranda.html';
                return;
            }
            
            setupEventListeners();
            console.log('Application initialized');
        }

        // Update authentication UI based on login status
        function updateAuthUI() {
            if (currentUser) {
                authSection.innerHTML = `
                    <div class="user-menu">
                        <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
                        <span class="user-name">${currentUser.name}</span>
                        <a href="beranda.html" class="dashboard-btn">Beranda</a>
                        <button class="logout-btn" id="logoutBtn">Keluar</button>
                    </div>
                `;
                dashboard.classList.add('active');
                
                // Tambahkan event listener untuk logout
                document.getElementById('logoutBtn').addEventListener('click', logout);
            }
        }

        // Setup event listeners
        function setupEventListeners() {
            // Dashboard tabs
            dashboardTabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    switchDashboardTab(tabName);
                });
            });

            // Dashboard forms
            document.getElementById('addSkill').addEventListener('click', addSkill);
            document.getElementById('saveProfile').addEventListener('click', saveProfile);
            document.getElementById('addProject').addEventListener('click', addProject);

            // Edit project modal
            editProjectForm.addEventListener('submit', handleEditProject);
            cancelEditBtn.addEventListener('click', hideEditProjectModal);

            // Profile picture upload
            setupProfilePictureUpload();

            // Theme toggle
            setupThemeToggle();

            // Mobile menu
            setupMobileMenu();
        }

        // Dashboard tab switching
        function switchDashboardTab(tabName) {
            dashboardTabs.forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
            });

            dashboardContents.forEach(content => {
                content.classList.toggle('active', content.id === `${tabName}-content`);
            });

            if (tabName === 'preview') {
                updateProfilePreview();
            }
        }

    // Load user data
    async function loadUserData() {
        if (!currentUser) {
            console.log('No current user found');
            return;
        }
    
    try {
        console.log('Loading user data for:', currentUser.id);
        const developerData = await apiService.getDeveloperByUserId(currentUser.id);
        
        console.log('Developer data loaded:', developerData);
        
        // JIKA PROFIL DEVELOPER TIDAK DITEMUKAN, BUAT OTOMATIS
        if (!developerData || developerData.error) {
            console.log('Developer profile not found, creating automatically...');
            
            try {
                const autoCreateResult = await apiService.autoCreateDeveloperProfile({
                    userId: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email
                });
                
                console.log('Auto-created developer profile:', autoCreateResult);
                
                // Reload data setelah dibuat
                const newDeveloperData = await apiService.getDeveloperByUserId(currentUser.id);
                populateFormData(newDeveloperData);
                return;
                
            } catch (autoCreateError) {
                console.error('Auto-create failed:', autoCreateError);
                // Tetap isi form dengan data user
                populateFormDataWithUserData();
                return;
            }
        }
        
        // ISI FORM DENGAN DATA DEVELOPER YANG ADA
        populateFormData(developerData);
        
        console.log('User data loading completed');
        
    } catch (error) {
        console.log('Error loading developer profile:', error);
        
        //FALLBACK: ISI FORM DENGAN DATA USER SAJA
        populateFormDataWithUserData();
    }
}

//FUNCTION BARU: ISI FORM DENGAN DATA DEVELOPER
function populateFormData(developerData) {
    document.getElementById('devName').value = developerData.name || currentUser.name || '';
    document.getElementById('devTitle').value = developerData.title || '';
    document.getElementById('devBio').value = developerData.bio || '';
    document.getElementById('devLocation').value = developerData.location || '';
    document.getElementById('devExperience').value = developerData.experience || '';
    document.getElementById('devEmail').value = developerData.email || currentUser.email || '';
    document.getElementById('devPhone').value = developerData.phone || '';
    document.getElementById('devGithub').value = developerData.github_url || '';
    document.getElementById('devLinkedin').value = developerData.linkedin_url || '';
    
    console.log('Form filled - Name:', document.getElementById('devName').value);
    console.log('Form filled - Title:', document.getElementById('devTitle').value);
    console.log('Form filled - Bio:', document.getElementById('devBio').value ? 'filled' : 'empty');
    
    // Load skills
    const skillsContainer = document.getElementById('skillsContainer');
    skillsContainer.innerHTML = '';
    if (developerData.skills && developerData.skills.length > 0) {
        console.log('Loading skills:', developerData.skills);
        developerData.skills.forEach(skill => {
            addSkillToDOM(skill);
        });
    } else {
        console.log('No skills found, leaving empty');
    }
    
    // Load profile picture
    loadProfilePicture(developerData);
    
    // Load projects
    const projectsContainer = document.getElementById('projectsContainer');
    projectsContainer.innerHTML = '';
    if (developerData.projects && developerData.projects.length > 0) {
        console.log('Loading projects:', developerData.projects.length);
        developerData.projects.forEach(project => {
            addProjectToDOM(project);
        });
    }
    
    // Simpan developer ID jika ada
    if (developerData.id) {
        localStorage.setItem('current_developer_id', developerData.id);
        console.log('Saved developer ID to localStorage:', developerData.id);
    }
}

//FUNCTION BARU: ISI FORM DENGAN DATA USER SAJA (FALLBACK)
function populateFormDataWithUserData() {
    document.getElementById('devName').value = currentUser.name || '';
    document.getElementById('devTitle').value = '';
    document.getElementById('devEmail').value = currentUser.email || '';

    // Kosongkan skills
    const skillsContainer = document.getElementById('skillsContainer');
    skillsContainer.innerHTML = '';

    
    console.log('Form filled with user data only');
    
    // Default profile picture
    showDefaultAnonymousImage();
}

        // Skill management
        function addSkill() {
            const skillInput = document.getElementById('skillInput');
            const skill = skillInput.value.trim();
            
            if (skill) {
                addSkillToDOM(skill);
                skillInput.value = '';
            }
        }

        function addSkillToDOM(skill) {
            const skillsContainer = document.getElementById('skillsContainer');
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-tag';
            skillElement.innerHTML = `
                ${skill}
                <span class="remove-skill" data-skill="${skill}">&times;</span>
            `;
            skillsContainer.appendChild(skillElement);
            
            // Add remove event listener
            skillElement.querySelector('.remove-skill').addEventListener('click', function() {
                skillsContainer.removeChild(skillElement);
            });
        }

    // Save profile
    async function saveProfile() {
        if (!currentUser) {
            showNotification('Silakan login terlebih dahulu', 'error');
            return;
        }

    console.log('Starting to save profile...');

    // Ambil nilai form
    const nameValue = document.getElementById('devName').value.trim();
    const titleValue = document.getElementById('devTitle').value.trim();
    
    // Validasi wajib
    if (!nameValue) {
        showNotification('Nama harus diisi', 'error');
        document.getElementById('devName').focus();
        return;
    }
    
    if (!titleValue) {
        showNotification('Judul profesi harus diisi', 'error');
        document.getElementById('devTitle').focus();
        return;
    }

    const developerData = {
        userId: parseInt(currentUser.id),
        name: nameValue,
        title: titleValue,
        bio: document.getElementById('devBio').value.trim(),
        location: document.getElementById('devLocation').value.trim(),
        experience: parseInt(document.getElementById('devExperience').value) || 0,
        email: document.getElementById('devEmail').value.trim() || currentUser.email,
        phone: document.getElementById('devPhone').value.trim(),
        github: document.getElementById('devGithub').value.trim(),
        linkedin: document.getElementById('devLinkedin').value.trim(),
        skills: Array.from(document.querySelectorAll('.skill-tag'))
            .map(tag => tag.textContent.replace('×', '').trim())
            .filter(skill => skill !== '')
    };
    
    console.log('Data to save:', { 
        name: developerData.name, 
        title: developerData.title,
        skills: developerData.skills.length 
    });
    
    try {
        console.log('Sending profile data to API...');
        
        // Gunakan function updateDeveloperProfile yang sudah diperbaiki
        const result = await updateDeveloperProfile(developerData);
        
        console.log('API Response:', result);
        
        if (result.success) {
            showNotification('Profil berhasil disimpan!', 'success');
            
            // Simpan developer ID
            if (result.developerId) {
                localStorage.setItem('current_developer_id', result.developerId);
                console.log('Developer ID saved:', result.developerId);
            }
            
            // Reload data
            setTimeout(() => {
                reloadBerandaData();
                loadUserData();
            }, 1000);
        } else {
            throw new Error(result.error || 'Save gagal');
        }
        
    } catch (error) {
        console.error('Save profile failed:', error);
        showNotification('Gagal menyimpan profil: ' + error.message, 'error');
    }
}

//FUNCTION UPDATE DEVELOPER PROFILE
async function updateDeveloperProfile(developerData) {
    try {
        console.log('Checking if developer profile exists...');
        
        // CEK DULU APAKAH PROFILE SUDAH ADA
        const existingProfile = await apiService.getDeveloperByUserId(developerData.userId);
        
        let response;
        
        if (existingProfile && !existingProfile.error) {
            // PROFILE SUDAH ADA - GUNAKAN UPDATE
            console.log('Profile exists, using UPDATE');
            response = await fetch('http://localhost:5000/api/developer/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiService.token}`
                },
                body: JSON.stringify(developerData)
            });
        } else {
            // PROFILE BELUM ADA - GUNAKAN CREATE
            console.log('Profile not found, using CREATE');
            response = await fetch('http://localhost:5000/api/developer/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiService.token}`
                },
                body: JSON.stringify(developerData)
            });
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Terjadi kesalahan');
        }

        return data;
    } catch (error) {
        console.error('Update profile error:', error);
        throw error;
    }
}

        // Project management
        async function addProject() {
            const developerId = localStorage.getItem('current_developer_id');
            
            if (!developerId) {
                showNotification('Anda harus menyimpan profil developer terlebih dahulu!', 'error');
                return;
            }

            // Validasi form
            const projectName = document.getElementById('projectName').value;
            const projectDescription = document.getElementById('projectDescription').value;
            
            if (!projectName || !projectDescription) {
                showNotification('Nama project dan deskripsi harus diisi', 'error');
                return;
            }

            const project = {
                developerId: parseInt(developerId),
                name: projectName,
                description: projectDescription,
                technologies: document.getElementById('projectTechnologies').value.split(',').map(t => t.trim()).filter(t => t !== ''),
                demo: document.getElementById('projectDemo').value,
                code: document.getElementById('projectCode').value
            };
            
            try {
                const result = await apiService.addProject(project);
                
                addProjectToDOM({
                    ...project,
                    id: result.projectId
                });
                
                // Clear form
                document.getElementById('projectName').value = '';
                document.getElementById('projectDescription').value = '';
                document.getElementById('projectTechnologies').value = '';
                document.getElementById('projectDemo').value = '';
                document.getElementById('projectCode').value = '';
                
                showNotification('Project berhasil ditambahkan!', 'success');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        }

        function addProjectToDOM(project) {
            const projectsContainer = document.getElementById('projectsContainer');
            const projectElement = document.createElement('div');
            projectElement.className = 'project-item';
            projectElement.setAttribute('data-project-id', project.id);
            
            projectElement.innerHTML = `
                <h4>${project.name}</h4>
                <p>${project.description}</p>
                <div class="project-technologies">
                    ${project.technologies ? project.technologies.map(tech => `<span class="skill">${tech}</span>`).join('') : ''}
                </div>
                <div class="project-actions">
                    <a href="${project.demo || '#'}" class="btn btn-sm btn-outline" target="_blank">Demo</a>
                    <a href="${project.code || '#'}" class="btn btn-sm btn-outline" target="_blank">Kode</a>
                    <button class="btn btn-sm btn-primary edit-project" data-id="${project.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-project" data-id="${project.id}">Hapus</button>
                </div>
            `;
            
            projectsContainer.appendChild(projectElement);
            
            // Add delete event listener
            projectElement.querySelector('.delete-project').addEventListener('click', function() {
                const projectId = this.getAttribute('data-id');
                deleteProject(projectId, projectElement);
            });
            
            // Add edit event listener
            projectElement.querySelector('.edit-project').addEventListener('click', function() {
                const projectId = this.getAttribute('data-id');
                editProject(projectId, project);
            });
        }

        async function deleteProject(projectId, projectElement) {
            if (!confirm('Apakah Anda yakin ingin menghapus project ini?')) {
                return;
            }
            
            try {
                await apiService.deleteProject(projectId);
                
                // Remove from DOM
                projectElement.remove();
                
                showNotification('Project berhasil dihapus!', 'success');
            } catch (error) {
                showNotification('Gagal menghapus project: ' + error.message, 'error');
            }
        }

        // Edit project functionality
        function editProject(projectId, projectData) {
            console.log('Edit project clicked:', projectId, projectData);
            
            // Isi form edit dengan data project yang ada
            document.getElementById('editProjectId').value = projectId;
            document.getElementById('editProjectName').value = projectData.name || '';
            document.getElementById('editProjectDescription').value = projectData.description || '';
            
            // Handle technologies
            let technologiesValue = '';
            if (Array.isArray(projectData.technologies)) {
                technologiesValue = projectData.technologies.join(', ');
            } else if (projectData.technologies) {
                technologiesValue = projectData.technologies;
            }
            document.getElementById('editProjectTechnologies').value = technologiesValue;
            
            document.getElementById('editProjectDemo').value = projectData.demo || '';
            document.getElementById('editProjectCode').value = projectData.code || '';
            
            // Tampilkan modal edit
            showEditProjectModal();
        }

        function showEditProjectModal() {
            editProjectModal.style.display = 'block';
        }

        function hideEditProjectModal() {
            editProjectModal.style.display = 'none';
        }

        async function handleEditProject(e) {
            e.preventDefault();
            
            const projectId = document.getElementById('editProjectId').value;
            const projectData = {
                name: document.getElementById('editProjectName').value,
                description: document.getElementById('editProjectDescription').value,
                technologies: document.getElementById('editProjectTechnologies').value.split(',').map(t => t.trim()).filter(t => t !== ''),
                demo: document.getElementById('editProjectDemo').value,
                code: document.getElementById('editProjectCode').value
            };
            
            try {
                await apiService.updateProject(projectId, projectData);
                
                // Update project di DOM
                updateProjectInDOM(projectId, projectData);
                
                // Sembunyikan modal
                hideEditProjectModal();
                
                showNotification('Project berhasil diperbarui!', 'success');
            } catch (error) {
                showNotification('Gagal memperbarui project: ' + error.message, 'error');
            }
        }

        function updateProjectInDOM(projectId, projectData) {
            const projectElement = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
            
            if (projectElement) {
                projectElement.querySelector('h4').textContent = projectData.name;
                projectElement.querySelector('p').textContent = projectData.description;
                
                // Update technologies
                const technologiesContainer = projectElement.querySelector('.project-technologies');
                technologiesContainer.innerHTML = projectData.technologies.map(tech => `<span class="skill">${tech}</span>`).join('');
                
                // Update links
                const demoLink = projectElement.querySelector('.project-actions a:first-child');
                const codeLink = projectElement.querySelector('.project-actions a:nth-child(2)');
                
                demoLink.href = projectData.demo || '#';
                codeLink.href = projectData.code || '#';
            }
        }

        // Profile preview
        function updateProfilePreview() {
            document.getElementById('previewName').textContent = document.getElementById('devName').value || 'Nama Developer';
            document.getElementById('previewTitle').textContent = document.getElementById('devTitle').value || 'Judul Profesi';
            document.getElementById('previewBio').textContent = document.getElementById('devBio').value || 'Deskripsi akan muncul di sini setelah Anda mengisi form profil.';
            
            const skillsContainer = document.getElementById('previewSkills');
            skillsContainer.innerHTML = '';
            const skills = Array.from(document.querySelectorAll('.skill-tag'))
                .map(tag => tag.textContent.replace('×', '').trim());
            
            skills.forEach(skill => {
                const skillElement = document.createElement('span');
                skillElement.className = 'skill';
                skillElement.textContent = skill;
                skillsContainer.appendChild(skillElement);
            });
            
            const github = document.getElementById('devGithub').value;
            const linkedin = document.getElementById('devLinkedin').value;
            
            document.getElementById('previewGithub').href = github || '#';
            document.getElementById('previewLinkedin').href = linkedin || '#';
            
            // Update preview image
            const profilePreviewImg = document.getElementById('profilePreviewImg');
            if (profilePreviewImg.style.display !== 'none') {
                document.getElementById('previewProfileImage').src = profilePreviewImg.src;
            }
        }

        // Profile picture functionality
function setupProfilePictureUpload() {
    const profilePictureInput = document.getElementById('profilePicture');
    const choosePictureBtn = document.getElementById('choosePictureBtn');
    const removePictureBtn = document.getElementById('removePictureBtn');

    choosePictureBtn.onclick = function() {
        profilePictureInput.click();
        return false;
    };

    profilePictureInput.onchange = function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Validasi file
            if (!file.type.startsWith('image/')) {
                showNotification('Hanya file gambar yang diizinkan!', 'error');
                return false;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Ukuran file maksimal 5MB!', 'error');
                return false;
            }

            // Preview image
            const reader = new FileReader();
            reader.onload = function(e) {
                const profilePreviewImg = document.getElementById('profilePreviewImg');
                const noImageText = document.getElementById('noImageText');
                const removePictureBtn = document.getElementById('removePictureBtn');
                
                profilePreviewImg.src = e.target.result;
                profilePreviewImg.style.display = 'block';
                noImageText.style.display = 'none';
                removePictureBtn.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);

            // Upload to server
            uploadProfilePicture(file);
        }
        return false;
    };

    //PERBAIKI FUNCTION HAPUS FOTO PROFIL
    removePictureBtn.onclick = async function() {
        if (!confirm('Apakah Anda yakin ingin menghapus foto profil?')) {
            return false;
        }

        // Tampilkan loading
        const originalText = removePictureBtn.innerHTML;
        removePictureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghapus...';
        removePictureBtn.disabled = true;

        try {
            await deleteProfilePicture();
        } catch (error) {
            console.error('Delete profile picture failed:', error);
        } finally {
            // Reset button
            removePictureBtn.innerHTML = originalText;
            removePictureBtn.disabled = false;
        }
        
        return false;
    };
}

//FUNCTION UNTUK HAPUS FOTO PROFIL DARI SERVER
async function deleteProfilePicture() {
    if (!currentUser) {
        showNotification('Silakan login terlebih dahulu', 'error');
        return false;
    }

    try {
        console.log('Deleting profile picture for user:', currentUser.id);
        
        const response = await fetch(`http://localhost:5000/api/developer/profile-picture/${currentUser.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${apiService.token}`
            }
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Terjadi kesalahan');
        }

        if (result.success) {
            showNotification('Foto profil berhasil dihapus!', 'success');
            
            //UPDATE UI SETELAH HAPUS - TAMPILKAN ANONIM
            resetProfilePicturePreview();
            
            // UPDATE LOCALSTORAGE 
            const userData = JSON.parse(localStorage.getItem('devhub_current_user') || '{}');
            delete userData.profile_picture;
            delete userData.profile_picture_url;
            localStorage.setItem('devhub_current_user', JSON.stringify(userData));
            
            console.log('Profile picture deleted successfully');
            
            // Reload data
            setTimeout(() => {
                reloadBerandaData();
                loadUserData();
            }, 1000);
            
            return true;
        } else {
            throw new Error(result.error || 'Hapus gagal');
        }
        
    } catch (error) {
        console.error('Delete profile picture failed:', error);
        showNotification('Gagal menghapus foto: ' + error.message, 'error');
        return false;
    }
}

//FUNCTION RESET PREVIEW FOTO PROFIL
function resetProfilePicturePreview() {
    const profilePreviewImg = document.getElementById('profilePreviewImg');
    const noImageText = document.getElementById('noImageText');
    const removePictureBtn = document.getElementById('removePictureBtn');
    const profilePictureInput = document.getElementById('profilePicture');
    
    //TAMPILKAN GAMBAR ANONIM DEFAULT
    showDefaultAnonymousImage();
    profilePictureInput.value = '';
    
    console.log('Profile picture preview reset to default anonymous');
}

//PERBAIKI UPLOAD PROFILE PICTURE - RELOAD DATA DENGAN BENAR
async function uploadProfilePicture(file) {
    if (!currentUser) {
        showNotification('Silakan login terlebih dahulu', 'error');
        return false;
    }

    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('userId', currentUser.id);

    const choosePictureBtn = document.getElementById('choosePictureBtn');
    const originalButtonText = choosePictureBtn.innerHTML;
    
    try {
        // Show loading
        choosePictureBtn.innerHTML = '<div class="loading-spinner"></div> Uploading...';
        choosePictureBtn.disabled = true;

        console.log('Starting upload for user:', currentUser.id);

        const response = await fetch('http://localhost:5000/api/upload-profile-picture', {
            method: 'POST',
            body: formData
        });

        console.log('Upload response status:', response.status);
        
        let result;
        try {
            result = await response.json();
            console.log('Upload response data:', result);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid server response');
        }

        if (!response.ok) {
            throw new Error(result.error || `Upload failed: ${response.status}`);
        }

        if (result.success) {
            showNotification('Foto profil berhasil diupload!', 'success');
            
            //UPDATE UI DENGAN FOTO BARU
            const profilePreviewImg = document.getElementById('profilePreviewImg');
            const noImageText = document.getElementById('noImageText');
            const removePictureBtn = document.getElementById('removePictureBtn');
            
            if (result.profilePictureUrl) {
                //GUNAKAN TIMESTAMP UNTUK HINDARI CACHE
                const timestamp = Date.now();
                const newImageUrl = result.profilePictureUrl + '?t=' + timestamp;
                
                profilePreviewImg.src = newImageUrl;
                profilePreviewImg.style.display = 'block';
                noImageText.style.display = 'none';
                removePictureBtn.style.display = 'inline-block';
                
                console.log('UI updated with new image:', newImageUrl);
                
                //SIMPAN INFORMASI FOTO KE LOCALSTORAGE 
                const userData = JSON.parse(localStorage.getItem('devhub_current_user') || '{}');
                userData.profile_picture = result.profilePicture;
                userData.profile_picture_url = result.profilePictureUrl;
                localStorage.setItem('devhub_current_user', JSON.stringify(userData));
                
                console.log('LocalStorage updated with profile picture');
                
                //RELOAD DATA DEVELOPER DI BERANDA
                reloadBerandaData();
                
                return true;
            }
        } else {
            throw new Error(result.error || 'Upload failed');
        }

    } catch (error) {
        console.error('Upload failed:', error);
        showNotification('Gagal upload foto: ' + error.message, 'error');
        
        //RESET PREVIEW JIKA GAGAL
        resetProfilePicturePreview();
        return false;
        
    } finally {
        // Reset button
        choosePictureBtn.innerHTML = originalButtonText;
        choosePictureBtn.disabled = false;
    }
}

//FUNCTION UNTUK RELOAD DATA DI BERANDA
function reloadBerandaData() {
    // Method 1: Gunakan localStorage event
    localStorage.setItem('devhub_data_updated', Date.now().toString());
    
    // Method 2: Jika di window yang sama, langsung panggil function
    if (window.opener && typeof window.opener.loadDevelopers === 'function') {
        window.opener.loadDevelopers();
        window.opener.loadAllDevelopers();
        console.log('Direct reload triggered in beranda');
    }
    
    // Method 3: Reload data di dashboard juga
    setTimeout(() => {
        loadUserData();
    }, 500);
    
    console.log('Beranda reload triggered');
}

//FUNCTION LOAD PROFILE PICTURE YANG DIPERBAIKI
function loadProfilePicture(developerData) {
    const profilePreviewImg = document.getElementById('profilePreviewImg');
    const noImageText = document.getElementById('noImageText');
    const removePictureBtn = document.getElementById('removePictureBtn');

    console.log('Loading profile picture for:', developerData.name);
    console.log('Profile picture data:', developerData.profile_picture);

    //RESET DULU SEBELUM LOAD
    profilePreviewImg.style.display = 'none';
    noImageText.style.display = 'flex';
    removePictureBtn.style.display = 'none';

    if (developerData.profile_picture) {
        //GUNAKAN URL LENGKAP
        const profilePictureUrl = `http://localhost:5000/uploads/profiles/${developerData.profile_picture}?t=${Date.now()}`;
        
        console.log('Loading profile picture from:', profilePictureUrl);
        
        profilePreviewImg.src = profilePictureUrl;
        
        //TEST IMAGE LOAD
        profilePreviewImg.onload = function() {
            console.log('Profile picture loaded successfully');
            profilePreviewImg.style.display = 'block';
            noImageText.style.display = 'none';
            removePictureBtn.style.display = 'inline-block';
        };
        
        profilePreviewImg.onerror = function() {
            console.error('Failed to load profile picture:', profilePictureUrl);
            //FALLBACK KE GAMBAR ANONIM YANG NORMAL 
            showDefaultAnonymousImage();
        };
        
    } else {
        console.log('No profile picture found');
        //TAMPILKAN GAMBAR ANONIM DEFAULT
        showDefaultAnonymousImage();
    }
}

//FUNCTION UNTUK MENAMPILKAN GAMBAR ANONIM DEFAULT
function showDefaultAnonymousImage() {
    const profilePreviewImg = document.getElementById('profilePreviewImg');
    const noImageText = document.getElementById('noImageText');
    const removePictureBtn = document.getElementById('removePictureBtn');
    
    //GUNAKAN GAMBAR ANONIM YANG NORMAL - ICON USER
    profilePreviewImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='none' stroke='%236c63ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
    profilePreviewImg.style.display = 'block';
    noImageText.style.display = 'none';
    removePictureBtn.style.display = 'none'; // Sembunyikan tombol hapus karena tidak ada foto
    
    console.log('Showing default anonymous image');
}
        // Logout function
        function logout() {
            currentUser = null;
            localStorage.removeItem('devhub_current_user');
            localStorage.removeItem('current_developer_id');
            localStorage.removeItem('devhub_token');
            
            showNotification('Anda telah logout', 'info');
            
            setTimeout(() => {
                window.location.href = 'beranda.html';
            }, 1000);
        }

        // Notification function
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }

        // Theme toggle
        function setupThemeToggle() {
            const themeToggle = document.getElementById('themeToggle');
            const themeIcon = themeToggle.querySelector('i');
            
            const savedTheme = localStorage.getItem('theme') || 'dark-mode';
            document.body.className = savedTheme;
            updateThemeIcon(savedTheme);
            
            themeToggle.addEventListener('click', function() {
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
        }

        // Mobile menu
        function setupMobileMenu() {
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
        }
        // Initialize the application
        init();
