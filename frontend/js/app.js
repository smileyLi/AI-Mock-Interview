class InterviewApp {
    constructor() {
        this.isInterviewActive = false;
        this.currentSessionId = null;
        this.isRecording = false;
        this.currentDetailSessionId = null;
        this.sidebarCollapsed = false;
        this.pendingDeleteSessionId = null;
        this.selectedRole = 'java_backend';

        this.initElements();
        this.initAuth();
        this.initPasswordToggles();
        this.init();
    }

    initElements() {
        // 认证面板
        this.authPanel = document.getElementById('auth-panel');
        this.mainApp = document.getElementById('main-app');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.forgotForm = document.getElementById('forgot-form');
        this.loginUsername = document.getElementById('login-username');
        this.loginPassword = document.getElementById('login-password');
        this.registerUsername = document.getElementById('register-username');
        this.registerEmail = document.getElementById('register-email');
        this.registerPassword = document.getElementById('register-password');
        this.registerCode = document.getElementById('register-code');
        this.registerSendCodeBtn = document.getElementById('register-send-code-btn');
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.switchToRegister = document.getElementById('switch-to-register');
        this.switchToLogin = document.getElementById('switch-to-login');
        this.switchToForgot = document.getElementById('switch-to-forgot');
        this.switchToLoginFromForgot = document.getElementById('switch-to-login-from-forgot');
        this.forgotUsername = document.getElementById('forgot-username');
        this.forgotEmail = document.getElementById('forgot-email');
        this.forgotPassword = document.getElementById('forgot-password');
        this.forgotCode = document.getElementById('forgot-code');
        this.sendCodeBtn = document.getElementById('send-code-btn');
        this.resetPasswordBtn = document.getElementById('reset-password-btn');

        // 侧边栏
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.sidebarExpandBtn = document.getElementById('sidebar-expand-btn');
        this.newInterviewBtn = document.getElementById('new-interview-btn');
        this.userAvatar = document.getElementById('user-avatar');
        this.userNameEl = document.getElementById('user-name');
        this.userEmailEl = document.getElementById('user-email-display');
        this.logoutBtn = document.getElementById('logout-btn');
        this.historyList = document.getElementById('history-list');
        this.historyEmpty = document.getElementById('history-empty');
        this.resumeStatusBadge = document.getElementById('resume-status-badge');
        this.resumeFileInput = document.getElementById('resume-file-input');
        this.resumeFileHint = document.getElementById('resume-file-hint');
        this.resumeClearBtn = document.getElementById('resume-clear-btn');

        // 欢迎面板
        this.welcomePanel = document.getElementById('welcome-panel');
        this.roleCards = document.querySelectorAll('.role-card');
        this.resumeUploadZone = document.getElementById('resume-upload-zone');
        this.resumeSavedState = document.getElementById('resume-saved-state');
        this.resumeUploadPrompt = document.getElementById('resume-upload-prompt');
        this.resumeFilename = document.getElementById('resume-filename');
        this.resumeChars = document.getElementById('resume-chars');
        this.resumeUploadHint = document.getElementById('resume-upload-hint');
        this.startInterviewBtn = document.getElementById('start-interview-btn');

        // 面试面板
        this.interviewPanel = document.getElementById('interview-panel');
        this.interviewRoleBadge = document.getElementById('interview-role-badge');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.chatArea = document.getElementById('chat-area');
        this.voiceBtn = document.getElementById('voice-btn');
        this.sendBtn = document.getElementById('send-btn');
        this.manualInput = document.getElementById('manual-input');
        this.endInterviewBtn = document.getElementById('end-interview-btn');
        this.viewReportBtn = document.getElementById('view-report-btn');

        // 详情面板
        this.detailPanel = document.getElementById('detail-panel');
        this.detailContent = document.getElementById('detail-content');
        this.detailBackBtn = document.getElementById('detail-back-btn');
        this.detailTitle = document.getElementById('detail-title');
        this.detailDeleteBtn = document.getElementById('detail-delete-btn');

        // 报告相关
        this.lastSummaryText = '';
        this.summaryReportModal = document.getElementById('summary-report-modal');
        this.summaryReportBody = document.getElementById('summary-report-body');
        this.summaryDownloadPdfBtn = document.getElementById('summary-download-pdf-btn');
        this.summaryModalCloseBtn = document.getElementById('summary-modal-close-btn');
        this.closeSummarySpan = document.querySelector('.close-summary');

        // 删除确认弹窗
        this.deleteConfirmModal = document.getElementById('delete-confirm-modal');
        this.deleteCancelBtn = document.getElementById('delete-cancel-btn');
        this.deleteConfirmBtn = document.getElementById('delete-confirm-btn');
        this.closeDeleteBtn = document.querySelector('.close-delete');

        // 清除简历确认弹窗
        this.clearResumeModal = document.getElementById('clear-resume-modal');
        this.clearResumeCancelBtn = document.getElementById('clear-resume-cancel-btn');
        this.clearResumeConfirmBtn = document.getElementById('clear-resume-confirm-btn');
        this.closeClearResumeBtn = document.querySelector('.close-clear-resume');
    }

    async initAuth() {
        if (apiClient.isAuthenticated()) {
            try {
                const user = await apiClient.getCurrentUser();
                apiClient.saveAuthState(apiClient.token, user);
                this.showMainApp();
                this.updateUserInfo();
                await this.loadSavedResumeInfo();
                await this.loadHistoryToSidebar();
            } catch (error) {
                console.log('Token validation failed:', error);
                apiClient.logout();
                this.clearPasswordFields();
                this.showAuthPanel();
            }
        } else {
            this.showAuthPanel();
        }

        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.registerBtn.addEventListener('click', () => this.handleRegister());
        this.registerSendCodeBtn?.addEventListener('click', () => this.handleSendRegisterCode());
        this.switchToRegister.addEventListener('click', (e) => { e.preventDefault(); this.switchToRegisterForm(); });
        this.switchToLogin.addEventListener('click', (e) => { e.preventDefault(); this.switchToLoginForm(); });
        this.switchToForgot?.addEventListener('click', (e) => { e.preventDefault(); this.switchToForgotForm(); });
        this.switchToLoginFromForgot?.addEventListener('click', (e) => { e.preventDefault(); this.switchToLoginForm(); });
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.sendCodeBtn?.addEventListener('click', () => this.handleSendCode());
        this.resetPasswordBtn?.addEventListener('click', () => this.handleResetPassword());

        window.addEventListener('auth:logout', () => {
            this.clearPasswordFields();
            this.showAuthPanel();
            this.toast('Session expired. Please sign in again.', 'error');
        });

        this.loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(); });
        this.registerPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleRegister(); });
    }

    async handleLogin() {
        const username = this.loginUsername.value.trim();
        const password = this.loginPassword.value;
        if (!username || !password) { this.toast('Please enter username and password', 'error'); return; }
        this.toast('Signing in...', 'info');
        try {
            await apiClient.login(username, password);
            this.toast('Signed in successfully', 'success');
            this.showMainApp();
            this.updateUserInfo();
            await this.loadSavedResumeInfo();
            await this.loadHistoryToSidebar();
        } catch (error) {
            this.toast(error.message || 'Login failed', 'error');
        }
    }

    async handleRegister() {
        const username = this.registerUsername.value.trim();
        const email = this.registerEmail.value.trim();
        const password = this.registerPassword.value;
        const code = this.registerCode.value.trim();
        if (!username || !email || !password || !code) { this.toast('All fields are required'); return; }
        if (username.length < 3) { this.toast('Username must be at least 3 characters'); return; }
        if (password.length < 6) { this.toast('Password must be at least 6 characters'); return; }
        if (code.length !== 6) { this.toast('Verification code must be 6 digits'); return; }
        try {
            await apiClient.register(username, email, password, code);
            this.toast('Registration successful', 'success');
            this.showMainApp();
            this.updateUserInfo();
            await this.loadSavedResumeInfo();
            await this.loadHistoryToSidebar();
        } catch (error) {
            this.toast(error.message || 'Registration failed');
        }
    }

    async handleSendRegisterCode() {
        const email = this.registerEmail.value.trim();
        if (!email) { this.toast('Please enter your email first'); return; }
        this.registerSendCodeBtn.disabled = true;
        this.registerSendCodeBtn.textContent = 'Sending...';
        try {
            const result = await apiClient.sendRegisterCode(email);
            this.toast(result.message || 'Verification code sent');
        } catch (error) {
            this.toast(error.message || 'Failed to send');
        } finally {
            this.registerSendCodeBtn.disabled = false;
            this.registerSendCodeBtn.textContent = 'Send Code';
        }
    }

    handleLogout() {
        apiClient.logout();
        this.clearPasswordFields();
        this.showAuthPanel();
        this.switchToLoginForm();
        this.toast('Signed out', 'info');
    }

    async handleSendCode() {
        const username = this.forgotUsername.value.trim();
        const email = this.forgotEmail.value.trim();
        if (!username || !email) { this.toast('Please enter username and email'); return; }
        this.sendCodeBtn.disabled = true;
        this.sendCodeBtn.textContent = 'Sending...';
        try {
            const result = await apiClient.forgotPassword(username, email);
            this.toast(result.message || 'Verification code sent');
        } catch (error) {
            this.toast(error.message || 'Failed to send');
        } finally {
            this.sendCodeBtn.disabled = false;
            this.sendCodeBtn.textContent = 'Send Code';
        }
    }

    async handleResetPassword() {
        const username = this.forgotUsername.value.trim();
        const email = this.forgotEmail.value.trim();
        const password = this.forgotPassword.value;
        const code = this.forgotCode.value.trim();
        if (!username || !email || !password || !code) { this.toast('All fields are required'); return; }
        if (password.length < 6) { this.toast('New password must be at least 6 characters'); return; }
        if (code.length !== 6) { this.toast('Verification code must be 6 digits'); return; }
        try {
            const result = await apiClient.resetPassword(username, email, code, password);
            this.toast(result.message || 'Password reset successfully');
            this.switchToLoginForm();
        } catch (error) {
            this.toast(error.message || 'Reset failed');
        }
    }

    clearAllAuthFields() {
        this.loginUsername.value = '';
        this.loginPassword.value = '';
        this.registerUsername.value = '';
        this.registerEmail.value = '';
        this.registerPassword.value = '';
        this.registerCode.value = '';
        if (this.forgotUsername) this.forgotUsername.value = '';
        if (this.forgotEmail) this.forgotEmail.value = '';
        if (this.forgotPassword) this.forgotPassword.value = '';
        if (this.forgotCode) this.forgotCode.value = '';
        document.querySelectorAll('.password-input-wrapper input').forEach(input => this._updatePasswordToggleState(input));
    }

    clearPasswordFields() {
        this.loginPassword.value = '';
        this.registerPassword.value = '';
        if (this.forgotPassword) this.forgotPassword.value = '';
        this._updatePasswordToggleState(this.loginPassword);
        this._updatePasswordToggleState(this.registerPassword);
        if (this.forgotPassword) this._updatePasswordToggleState(this.forgotPassword);
    }

    initPasswordToggles() {
        const eyeSvg = '<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        const eyeOffSvg = '<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const input = btn.closest('.password-input-wrapper').querySelector('input');
                const isPw = input.type === 'password';
                input.type = isPw ? 'text' : 'password';
                btn.innerHTML = isPw ? eyeOffSvg : eyeSvg;
            });
        });
        document.querySelectorAll('.password-input-wrapper input').forEach(input => {
            input.addEventListener('input', () => this._updatePasswordToggleState(input));
            input.addEventListener('blur', () => { setTimeout(() => this._updatePasswordToggleState(input), 200); });
        });
    }

    _updatePasswordToggleState(input) {
        const wrapper = input.closest('.password-input-wrapper');
        if (!wrapper) return;
        if (input.value.length > 0) wrapper.classList.add('has-text');
        else wrapper.classList.remove('has-text');
    }

    showAuthPanel() { this.authPanel.classList.remove('hidden'); this.mainApp.classList.add('hidden'); }
    showMainApp() { this.authPanel.classList.add('hidden'); this.mainApp.classList.remove('hidden'); }
    switchToRegisterForm() { this.clearAllAuthFields(); this.loginForm.classList.add('hidden'); this.forgotForm.classList.add('hidden'); this.registerForm.classList.remove('hidden'); }
    switchToLoginForm() { this.clearAllAuthFields(); this.registerForm.classList.add('hidden'); this.forgotForm.classList.add('hidden'); this.loginForm.classList.remove('hidden'); }
    switchToForgotForm() { this.clearAllAuthFields(); this.loginForm.classList.add('hidden'); this.registerForm.classList.add('hidden'); this.forgotForm.classList.remove('hidden'); }

    updateUserInfo() {
        if (apiClient.user) {
            this.userNameEl.textContent = apiClient.user.username;
            if (this.userEmailEl) this.userEmailEl.textContent = apiClient.user.email || '';
            this.userAvatar.textContent = (apiClient.user.username || 'U').charAt(0).toUpperCase();
        }
    }

    // ==================== 侧边栏 ====================

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        if (this.sidebarCollapsed) {
            this.sidebar.classList.add('collapsed');
            this.sidebarExpandBtn.classList.add('visible');
        } else {
            this.sidebar.classList.remove('collapsed');
            this.sidebarExpandBtn.classList.remove('visible');
        }
    }

    async loadHistoryToSidebar() {
        if (!apiClient.isAuthenticated()) return;
        try {
            const interviews = await apiClient.getInterviewHistory();
            this.renderSidebarHistory(interviews);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    renderSidebarHistory(interviews) {
        if (!this.historyList) return;

        if (interviews.length === 0) {
            this.historyEmpty.style.display = 'block';
            this.historyList.innerHTML = '';
            this.historyList.appendChild(this.historyEmpty);
            return;
        }

        this.historyEmpty.style.display = 'none';
        const roleNames = { 'java_backend': 'Java Backend', 'web_frontend': 'Web Frontend' };

        const html = interviews.map(item => {
            const role = roleNames[item.job_role] || 'Java Backend';
            const msgCount = (item.messages && item.messages.length) ? Math.floor(item.messages.length / 2) : 0;
            const hasReport = item.summary && item.summary.trim().length > 0;
            return `
                <div class="history-item ${this.currentDetailSessionId === item.session_id ? 'active' : ''}" data-sid="${item.session_id}">
                    <div class="history-item-date">${this.formatDate(item.created_at)}</div>
                    <div class="history-item-meta">
                        <span class="history-item-role">${role}</span>
                        ${msgCount > 0 ? `<span class="history-item-badge">${msgCount}Q</span>` : ''}
                        ${hasReport ? '<span class="history-item-badge" style="background:rgba(5,150,105,0.2);color:#34d399;">Report</span>' : ''}
                    </div>
                    <button class="history-item-delete" data-sid="${item.session_id}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>`;
        }).join('');

        this.historyList.innerHTML = html;

        this.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.history-item-delete')) {
                    e.stopPropagation();
                    this.pendingDeleteSessionId = e.target.closest('.history-item-delete').dataset.sid;
                    this.openDeleteConfirmModal();
                } else {
                    this.showHistoryDetail(item.dataset.sid);
                }
            });
        });
    }

    onNewInterviewClick() {
        if (this.isInterviewActive) {
            if (!confirm('An interview is in progress. Start a new one?')) return;
        }
        this.showWelcomePanel();
    }

    // ==================== 面板切换 ====================

    showWelcomePanel() {
        this.welcomePanel.classList.remove('hidden');
        this.interviewPanel.classList.add('hidden');
        this.detailPanel.classList.add('hidden');
        this.currentDetailSessionId = null;
        this.newInterviewBtn.classList.add('active');
        this.loadHistoryToSidebar();
    }

    showInterviewPanel() {
        this.welcomePanel.classList.add('hidden');
        this.interviewPanel.classList.remove('hidden');
        this.detailPanel.classList.add('hidden');
        this.currentDetailSessionId = null;
        this.newInterviewBtn.classList.remove('active');
    }

    showDetailPanel() {
        this.welcomePanel.classList.add('hidden');
        this.interviewPanel.classList.add('hidden');
        this.detailPanel.classList.remove('hidden');
        this.newInterviewBtn.classList.remove('active');
    }

    getRoleDisplayName(role) {
        const map = { 'java_backend': 'Java Backend', 'web_frontend': 'Web Frontend' };
        return map[role] || 'Java Backend';
    }

    getSelectedJobRole() { return this.selectedRole; }

    // ==================== 角色选择 ====================

    initRoleSelector() {
        this.roleCards.forEach(card => {
            card.addEventListener('click', () => {
                this.roleCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedRole = card.dataset.role;
            });
        });
    }

    // ==================== 简历上传 ====================

    async onResumeFileSelected(event) {
        const file = event.target?.files?.[0];
        if (!file) return;

        this.resumeUploadHint.textContent = 'Parsing...';
        this.toast('Parsing resume...', 'info');

        try {
            const result = await apiClient.parseResume(file);
            const text = (result.text != null ? String(result.text) : '').trim();

            if (!text) {
                this.resumeUploadHint.textContent = 'No text extracted (scanned PDF?)';
                this.toast('No readable text found in file', 'error');
                return;
            }

            const name = result.filename || file.name;
            const extra = result.truncated ? ' (truncated)' : '';
            await this.saveResumeToServer(text, name);
            this.resumeUploadHint.textContent = `${name} — ${text.length} characters${extra}`;
            this.toast('Resume uploaded successfully', 'success');
        } catch (error) {
            console.error('Resume parse failed:', error);
            this.resumeUploadHint.textContent = 'Parse failed — try PDF or DOCX';
            this.toast(error.message || '系统错误', 'error');
        }
    }

    async saveResumeToServer(text, filename) {
        try {
            await apiClient.saveResume(text, filename);
            await this.loadSavedResumeInfo();
        } catch (error) {
            console.error('Save resume failed:', error);
            throw error;
        }
    }

    async loadSavedResumeInfo() {
        if (!apiClient.isAuthenticated()) return;
        try {
            const info = await apiClient.getResumeInfo();
            this.updateResumeStatus(info);
        } catch (error) {
            console.error('Load resume info failed:', error);
            this.updateResumeStatus(null);
        }
    }

    updateResumeStatus(info) {
        const hasResume = info && info.exists;

        // 侧边栏 badge
        if (this.resumeStatusBadge) {
            this.resumeStatusBadge.textContent = hasResume ? 'Uploaded' : 'None';
            if (hasResume) this.resumeStatusBadge.classList.add('has-resume');
            else this.resumeStatusBadge.classList.remove('has-resume');
        }

        // 侧边栏 hint
        if (this.resumeFileHint) {
            this.resumeFileHint.textContent = hasResume ? (info.filename || 'Resume saved') : 'PDF, DOCX (max 10MB)';
        }

        // 欢迎面板状态
        if (hasResume) {
            this.resumeSavedState.classList.remove('hidden');
            this.resumeUploadPrompt.classList.add('hidden');
            this.resumeFilename.textContent = info.filename || 'Resume';
            this.resumeChars.textContent = `${info.char_count || 0} characters`;
            if (this.resumeClearBtn) this.resumeClearBtn.style.display = '';
        } else {
            this.resumeSavedState.classList.add('hidden');
            this.resumeUploadPrompt.classList.remove('hidden');
        }
    }

    openClearResumeModal() {
        if (this.clearResumeModal) this.clearResumeModal.style.display = 'block';
    }

    closeClearResumeModal() {
        if (this.clearResumeModal) this.clearResumeModal.style.display = 'none';
    }

    async confirmClearResume() {
        this.closeClearResumeModal();
        try {
            await apiClient.deleteResume();
            this.updateResumeStatus(null);
            this.resumeUploadHint.textContent = '';
            if (this.resumeFileInput) this.resumeFileInput.value = '';
            this.toast('Resume removed', 'info');
        } catch (error) {
            console.error('Clear resume failed:', error);
            this.toast('Failed to remove resume', 'error');
        }
    }

    // ==================== 面试流程 ====================

    async startInterview() {
        if (this.isInterviewActive) return;

        const jobRole = this.getSelectedJobRole();
        this.updateInterviewRoleBadge(jobRole);

        this.toast('Starting interview...', 'info');
        this.startInterviewBtn.disabled = true;

        try {
            const result = await apiClient.startInterview('', jobRole);
            this.currentSessionId = result.session_id;
            this.isInterviewActive = true;

            this.showInterviewPanel();
            this.chatArea.innerHTML = '';

            this.endInterviewBtn.disabled = false;
            this.hideReportButton();
            this.enableRecording(false);

            this.addMessage('assistant', result.first_question);
            audioPlayer.speak(result.first_question);

            this.updateStatus('Interviewer is speaking...', 'thinking');
        } catch (error) {
            console.error('Start interview failed:', error);
            this.toast('Failed to start: ' + (error.message || '系统错误'), 'error');
            this.startInterviewBtn.disabled = false;
        }
    }

    async toggleRecording() {
        if (!this.isInterviewActive) {
            this.toast('Start the interview first', 'error');
            return;
        }
        if (this.isRecording) {
            audioRecorder.stopListening();
        } else {
            audioPlayer.stop();
            this.updateStatus('Listening...', 'speaking');
            var started = audioRecorder.startListening();
            if (started) {
                this.isRecording = true;
                this.voiceBtn.classList.add('recording');
            } else {
                this.updateStatus('Microphone unavailable', 'error');
            }
        }
    }

    async handleUserInput(text) {
        if (!this.isInterviewActive) { this.toast('No active interview', 'error'); return; }
        if (!text || text.trim() === '') { this.toast('No speech recognized', 'error'); this.enableRecording(true); return; }

        this.addMessage('user', text);
        this.enableRecording(false);
        this.updateStatus('Processing your answer...', 'thinking');

        try {
            const reply = await apiClient.sendMessage(text);
            this.addMessage('assistant', reply);
            audioPlayer.speak(reply);
        } catch (error) {
            console.error('Send failed:', error);
            this.updateStatus('Send failed, please retry', 'error');
            this.enableRecording(true);
        }
    }

    async sendManualMessage() {
        const text = this.manualInput.value.trim();
        if (!text) return;
        this.manualInput.value = '';
        await this.handleUserInput(text);
    }

    async endInterview() {
        if (!this.isInterviewActive) return;

        this.updateStatus('Ending interview, generating summary...', 'thinking');
        this.enableRecording(false);
        this.endInterviewBtn.disabled = true;

        try {
            const summary = await apiClient.endInterview();
            this.addMessage('system', 'Interview has ended. Click "View Report" to see the full summary.');
            this.showReportButton(summary);
            this.isInterviewActive = false;
            this.startInterviewBtn.disabled = false;
            this.currentSessionId = null;
            await this.loadSavedResumeInfo();
            this.updateStatus('Interview finished', 'idle');
            await this.loadHistoryToSidebar();
        } catch (error) {
            console.error('End interview failed:', error);
            this.toast('Failed to end interview', 'error');
            this.endInterviewBtn.disabled = false;
        }
    }

    // ==================== UI 辅助 ====================

    addMessage(role, content) {
        const wrapper = document.createElement('div');
        wrapper.className = `msg-wrapper msg-${role}`;

        if (role === 'assistant') {
            const avatar = document.createElement('div');
            avatar.className = 'msg-avatar';
            avatar.textContent = 'AI';
            wrapper.appendChild(avatar);
        } else if (role === 'user') {
            const avatar = document.createElement('div');
            avatar.className = 'msg-avatar';
            avatar.textContent = (apiClient.user?.username || 'U').charAt(0).toUpperCase();
            wrapper.appendChild(avatar);
        }

        const body = document.createElement('div');
        body.className = 'msg-body';

        if (role !== 'system') {
            const sender = document.createElement('div');
            sender.className = 'msg-sender';
            sender.textContent = role === 'assistant' ? 'Interviewer' : 'You';
            body.appendChild(sender);
        }

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = content;
        body.appendChild(bubble);
        wrapper.appendChild(body);

        this.chatArea.appendChild(wrapper);
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
    }

    enableRecording(enabled) {
        this.voiceBtn.disabled = !enabled;
        this.manualInput.disabled = !enabled;
        this.sendBtn.disabled = !enabled;
        if (enabled) {
            this.updateStatus('Waiting for your answer...', 'idle');
        }
    }

    updateStatus(message, state) {
        if (this.statusText) this.statusText.textContent = message;
        if (this.statusDot) {
            this.statusDot.className = 'interview-status-dot';
            if (state === 'thinking' || state === 'speaking') this.statusDot.classList.add(state);
        }
    }

    toast(message, type) {
        const container = document.getElementById('toast-container');
        if (!container || !message) return;
        const el = document.createElement('div');
        el.className = 'toast-message';
        el.textContent = message;
        if (type === 'error') el.style.color = '#dc2626';
        else if (type === 'success') el.style.color = '#059669';
        container.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s ease'; setTimeout(() => el.remove(), 300); }, 1500);
    }

    updateInterviewRoleBadge(role) {
        if (this.interviewRoleBadge) this.interviewRoleBadge.textContent = this.getRoleDisplayName(role);
    }

    hideReportButton() {
        this.lastSummaryText = '';
        if (this.summaryReportBody) this.summaryReportBody.innerHTML = '';
        if (this.viewReportBtn) { this.viewReportBtn.classList.add('btn-hidden'); this.viewReportBtn.disabled = true; }
        this.closeSummaryReportModal();
    }

    showReportButton(summary) {
        this.lastSummaryText = summary != null ? String(summary) : '';
        if (this.summaryReportBody) {
            if (typeof renderInterviewSummaryHtml === 'function') {
                this.summaryReportBody.innerHTML = renderInterviewSummaryHtml(this.lastSummaryText);
            } else {
                this.summaryReportBody.textContent = this.lastSummaryText;
            }
        }
        if (this.viewReportBtn) { this.viewReportBtn.classList.remove('btn-hidden'); this.viewReportBtn.disabled = false; }
    }

    openSummaryReportModal() {
        if (!this.summaryReportModal || !this.summaryReportBody) return;
        const raw = this.lastSummaryText || '';
        if (typeof renderInterviewSummaryHtml === 'function') {
            this.summaryReportBody.innerHTML = raw ? renderInterviewSummaryHtml(raw) : '<p class="report-empty">No report content available.</p>';
        } else {
            this.summaryReportBody.textContent = raw || 'No report content available.';
        }
        this.summaryReportModal.style.display = 'block';
    }

    closeSummaryReportModal() {
        if (this.summaryReportModal) this.summaryReportModal.style.display = 'none';
    }

    downloadSummaryPdf() {
        if (typeof html2pdf === 'undefined') { this.toast('PDF module not loaded. Refresh and try again.', 'error'); return; }
        const el = this.summaryReportBody;
        if (!el || !String(el.textContent || '').trim()) { this.toast('No report content to download', 'error'); return; }

        const filename = `Interview_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
        const opt = {
            margin: 12, filename, image: { type: 'jpeg', quality: 0.92 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        };
        const prevMax = el.style.maxHeight, prevOv = el.style.overflow;
        el.style.maxHeight = 'none'; el.style.overflow = 'visible';
        const restore = () => { el.style.maxHeight = prevMax; el.style.overflow = prevOv; };
        const p = html2pdf().set(opt).from(el).save();
        if (p && typeof p.finally === 'function') p.finally(restore);
        else if (p && typeof p.then === 'function') p.then(restore).catch(restore);
        else setTimeout(restore, 1500);
    }

    // ==================== 历史详情 ====================

    async showHistoryDetail(sessionId) {
        try {
            const interview = await apiClient.getInterviewDetail(sessionId);
            this.currentDetailSessionId = sessionId;
            this.showDetailPanel();

            const role = this.getRoleDisplayName(interview.job_role || 'java_backend');
            this.detailTitle.textContent = `${role} — ${this.formatDate(interview.created_at)}`;

            let html = '<div class="detail-messages">';
            interview.messages.forEach(msg => {
                const senderName = msg.role === 'user' ? 'You' : 'Interviewer';
                const avatarChar = msg.role === 'user'
                    ? ((apiClient.user?.username || 'U').charAt(0).toUpperCase())
                    : 'AI';
                const roleClass = msg.role === 'user' ? 'msg-user' : 'msg-assistant';
                html += `
                    <div class="msg-wrapper ${roleClass}">
                        <div class="msg-avatar">${avatarChar}</div>
                        <div class="msg-body">
                            <div class="msg-sender">${senderName}</div>
                            <div class="msg-bubble">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                        </div>
                    </div>`;
            });
            html += '</div>';

            if (interview.summary) {
                html += `
                    <div class="detail-summary-card">
                        <h3>Interview Summary Report</h3>
                        <button class="btn-view-report" onclick="app.viewHistoryReport('${sessionId}')">View Full Report</button>
                    </div>`;
            }

            this.detailContent.innerHTML = html;
            this.loadHistoryToSidebar();
        } catch (error) {
            console.error('Load detail failed:', error);
            this.toast('Failed to load interview detail', 'error');
        }
    }

    async viewHistoryReport(sessionId) {
        try {
            const interview = await apiClient.getInterviewDetail(sessionId);
            if (interview && interview.summary) {
                this.showReportButton(interview.summary);
                this.openSummaryReportModal();
            } else {
                this.toast('No report found', 'error');
            }
        } catch (error) {
            console.error('Load report failed:', error);
            this.toast('Failed to load report', 'error');
        }
    }

    // ==================== 弹窗操作 ====================

    openDeleteConfirmModal() { if (this.deleteConfirmModal) this.deleteConfirmModal.style.display = 'block'; }
    closeDeleteConfirmModal() { if (this.deleteConfirmModal) this.deleteConfirmModal.style.display = 'none'; this.pendingDeleteSessionId = null; }

    async confirmDelete() {
        const sessionId = this.pendingDeleteSessionId;
        this.closeDeleteConfirmModal();
        try {
            const result = await apiClient.deleteInterview(sessionId);
            if (result.success) {
                if (this.currentDetailSessionId === sessionId) this.showWelcomePanel();
                await this.loadHistoryToSidebar();
                this.toast('Interview record deleted', 'info');
            } else {
                this.toast(result.message, 'error');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            this.toast('Delete failed', 'error');
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const y = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const mi = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${mo}-${d} ${h}:${mi}`;
    }

    // ==================== 初始化 ====================

    init() {
        this.initRoleSelector();

        // 侧边栏
        this.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.sidebarExpandBtn?.addEventListener('click', () => this.toggleSidebar());
        this.newInterviewBtn?.addEventListener('click', () => this.onNewInterviewClick());

        // 简历
        this.resumeFileInput?.addEventListener('change', (e) => this.onResumeFileSelected(e));
        this.resumeClearBtn?.addEventListener('click', () => this.openClearResumeModal());

        // 面试控制
        this.startInterviewBtn?.addEventListener('click', () => this.startInterview());
        this.voiceBtn?.addEventListener('click', () => this.toggleRecording());
        this.endInterviewBtn?.addEventListener('click', () => this.endInterview());
        this.sendBtn?.addEventListener('click', () => this.sendManualMessage());
        this.manualInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendManualMessage(); });

        // 详情面板
        this.detailBackBtn?.addEventListener('click', () => this.showWelcomePanel());
        this.detailDeleteBtn?.addEventListener('click', () => {
            if (!this.currentDetailSessionId) return;
            this.pendingDeleteSessionId = this.currentDetailSessionId;
            this.openDeleteConfirmModal();
        });

        // 报告
        this.viewReportBtn?.addEventListener('click', () => this.openSummaryReportModal());
        this.summaryDownloadPdfBtn?.addEventListener('click', () => this.downloadSummaryPdf());
        this.summaryModalCloseBtn?.addEventListener('click', () => this.closeSummaryReportModal());
        this.closeSummarySpan?.addEventListener('click', () => this.closeSummaryReportModal());

        // 删除弹窗
        this.deleteCancelBtn?.addEventListener('click', () => this.closeDeleteConfirmModal());
        this.deleteConfirmBtn?.addEventListener('click', () => this.confirmDelete());
        this.closeDeleteBtn?.addEventListener('click', () => this.closeDeleteConfirmModal());

        // 清除简历弹窗
        this.clearResumeCancelBtn?.addEventListener('click', () => this.closeClearResumeModal());
        this.clearResumeConfirmBtn?.addEventListener('click', () => this.confirmClearResume());
        this.closeClearResumeBtn?.addEventListener('click', () => this.closeClearResumeModal());

        // 音频回调
        audioRecorder.onResult = (text) => this.handleUserInput(text);
        audioRecorder.onError = (error) => {
            this.updateStatus('Speech recognition error', 'error');
            this.isRecording = false;
            this.voiceBtn.classList.remove('recording');
        };
        audioRecorder.onEnd = () => {
            this.isRecording = false;
            this.voiceBtn.classList.remove('recording');
        };
        audioPlayer.onStart = () => { this.updateStatus('Interviewer is speaking...', 'speaking'); };
        audioPlayer.onEnd = () => {
            this.updateStatus('Waiting for your answer...', 'idle');
            if (this.isInterviewActive) this.enableRecording(true);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new InterviewApp();
});
