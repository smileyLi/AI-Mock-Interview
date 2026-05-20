// 主逻辑
class InterviewApp {
    constructor() {
        this.isInterviewActive = false;
        this.currentSessionId = null;
        this.isRecording = false;
        this.currentDetailSessionId = null;
        this.sidebarCollapsed = false;
        this.pendingDeleteSessionId = null;

        // 侧边栏元素
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
        this.newInterviewBtn = document.getElementById('newInterviewBtn');
        this.historyListSidebar = document.getElementById('historyListSidebar');
        this.historyEmptySidebar = document.getElementById('historyEmptySidebar');

        // 主界面元素
        this.mainContent = document.querySelector('.main-content');
        this.interviewPanel = document.getElementById('interviewPanel');
        this.detailPanel = document.getElementById('detailPanel');
        this.detailContent = document.getElementById('detailContent');
        this.deleteHistoryBtnDetail = document.getElementById('deleteHistoryBtnDetail');
        this.jobTitle = document.getElementById('jobTitle');

        // 聊天区域
        this.chatArea = document.getElementById('chatArea');
        this.statusDiv = document.getElementById('status');
        this.manualInput = document.getElementById('manualInput');
        this.sendBtn = document.getElementById('sendBtn');

        // 简历上传
        this.resumeFileInput = document.getElementById('resumeFileInput');
        this.resumeHint = document.getElementById('resumeHint');
        this.resumeStatusText = document.getElementById('resumeStatusText');
        this.clearResumeBtn = document.getElementById('clearResumeBtn');
        this.jobSelect = document.getElementById('jobSelect');

        // 控制按钮
        this.startBtn = document.getElementById('startBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.endBtn = document.getElementById('endBtn');

        // 报告相关
        this.lastSummaryText = '';
        this.viewReportBtn = document.getElementById('viewReportBtn');
        this.summaryReportModal = document.getElementById('summaryReportModal');
        this.summaryReportBody = document.getElementById('summaryReportBody');
        this.summaryDownloadPdfBtn = document.getElementById('summaryDownloadPdfBtn');
        this.summaryModalCloseBtn = document.getElementById('summaryModalCloseBtn');
        this.closeSummarySpan = document.querySelector('.close-summary');

        // 删除确认弹窗
        this.deleteConfirmModal = document.getElementById('deleteConfirmModal');
        this.deleteCancelBtn = document.getElementById('deleteCancelBtn');
        this.deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
        this.closeDeleteBtn = document.querySelector('.close-delete');

        // 清除简历确认弹窗
        this.clearResumeModal = document.getElementById('clearResumeModal');
        this.clearResumeCancelBtn = document.getElementById('clearResumeCancelBtn');
        this.clearResumeConfirmBtn = document.getElementById('clearResumeConfirmBtn');
        this.closeClearResumeBtn = document.querySelector('.close-clear-resume');

        // 岗位选择区域
        this.jobSelectArea = document.getElementById('jobSelectArea');

        this.init();
        this.loadHistoryToSidebar();
        this.loadSavedResumeInfo();
        this.showJobSelect();
    }

    // 岗位名称映射
    getJobTitle(jobRole) {
        const titles = {
            'java_backend': '☕ Java后端开发工程师岗位',
            'web_frontend': '🎨 Web前端开发工程师岗位'
        };
        return titles[jobRole] || titles['java_backend'];
    }

    // 更新页面标题
    updateJobTitle(jobRole) {
        if (this.jobTitle) {
            this.jobTitle.textContent = this.getJobTitle(jobRole);
        }
    }

    // 获取当前选择的岗位
    getSelectedJobRole() {
        if (this.jobSelect) {
            return this.jobSelect.value;
        }
        return 'java_backend';
    }

    init() {
        // 侧边栏交互
        this.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.sidebarExpandBtn?.addEventListener('click', () => this.toggleSidebar());
        this.newInterviewBtn?.addEventListener('click', () => this.onNewInterviewClick());

        // 简历上传
        this.resumeFileInput?.addEventListener('change', (e) => this.onResumeFileSelected(e));
        this.clearResumeBtn?.addEventListener('click', () => this.openClearResumeModal());

        // 岗位选择
        this.jobSelect?.addEventListener('change', () => {
            const jobRole = this.getSelectedJobRole();
            this.updateJobTitle(jobRole);
        });

        // 控制按钮
        this.startBtn?.addEventListener('click', () => this.onStartButtonClick());
        this.recordBtn?.addEventListener('click', () => this.toggleRecording());
        this.endBtn?.addEventListener('click', () => this.endInterview());

        // 手动输入
        this.sendBtn?.addEventListener('click', () => this.sendManualMessage());
        this.manualInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendManualMessage();
        });

        // 历史详情
        this.deleteHistoryBtnDetail?.addEventListener('click', () => this.deleteCurrentHistory());

        // 报告
        this.viewReportBtn?.addEventListener('click', () => this.openSummaryReportModal());
        this.summaryDownloadPdfBtn?.addEventListener('click', () => this.downloadSummaryPdf());
        this.summaryModalCloseBtn?.addEventListener('click', () => this.closeSummaryReportModal());
        this.closeSummarySpan?.addEventListener('click', () => this.closeSummaryReportModal());

        // 删除确认弹窗
        this.deleteCancelBtn?.addEventListener('click', () => this.closeDeleteConfirmModal());
        this.deleteConfirmBtn?.addEventListener('click', () => this.confirmDelete());
        this.closeDeleteBtn?.addEventListener('click', () => this.closeDeleteConfirmModal());

        // 清除简历确认弹窗
        this.clearResumeCancelBtn?.addEventListener('click', () => this.closeClearResumeModal());
        this.clearResumeConfirmBtn?.addEventListener('click', () => this.confirmClearResume());
        this.closeClearResumeBtn?.addEventListener('click', () => this.closeClearResumeModal());

        // 语音和音频回调
        audioRecorder.onResult = (text) => this.handleUserInput(text);
        audioRecorder.onError = (error) => {
            this.updateStatus(`语音识别错误: ${error}`, 'error');
            this.isRecording = false;
            this.recordBtn.textContent = '🎙️ 按住说话';
            this.recordBtn.classList.remove('recording');
        };
        audioRecorder.onEnd = () => {
            this.isRecording = false;
            this.recordBtn.textContent = '🎙️ 按住说话';
            this.recordBtn.classList.remove('recording');
        };

        audioPlayer.onStart = () => {
            this.updateStatus('面试官正在说话...', 'info');
        };
        audioPlayer.onEnd = () => {
            this.updateStatus('等待您的回答...', 'info');
            if (this.isInterviewActive) {
                this.enableRecording(true);
            }
        };
    }

    // ==================== 侧边栏功能 ====================

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        if (this.sidebarCollapsed) {
            this.sidebar.classList.add('collapsed');
            this.sidebarExpandBtn.classList.add('visible');
            this.mainContent.classList.add('full-width');
        } else {
            this.sidebar.classList.remove('collapsed');
            this.sidebarExpandBtn.classList.remove('visible');
            this.mainContent.classList.remove('full-width');
        }
    }

    async loadHistoryToSidebar() {
        try {
            const interviews = await apiClient.getInterviewHistory();
            this.renderSidebarHistory(interviews);
        } catch (error) {
            console.error('加载历史记录失败:', error);
        }
    }

    renderSidebarHistory(interviews) {
        if (!this.historyListSidebar) return;

        if (interviews.length === 0) {
            this.historyEmptySidebar.style.display = 'block';
            this.historyListSidebar.innerHTML = '';
            this.historyListSidebar.appendChild(this.historyEmptySidebar);
            return;
        }

        this.historyEmptySidebar.style.display = 'none';
        const html = interviews.map(interview => `
            <div class="history-item-sidebar ${this.currentDetailSessionId === interview.session_id ? 'active' : ''}" data-session-id="${interview.session_id}">
                <div class="history-item-sidebar-date">${this.formatDate(interview.created_at)}</div>
                <div class="history-item-sidebar-position">${this.getJobTitle(interview.job_role || 'java_backend').replace('岗位', '')}</div>
                <button class="history-item-sidebar-delete" data-session-id="${interview.session_id}">删除</button>
            </div>
        `).join('');

        this.historyListSidebar.innerHTML = html;

        this.historyListSidebar.querySelectorAll('.history-item-sidebar').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('history-item-sidebar-delete')) {
                    e.stopPropagation();
                    const sessionId = e.target.dataset.sessionId;
                    this.deleteHistoryFromSidebar(sessionId);
                } else {
                    const sessionId = item.dataset.sessionId;
                    this.showHistoryDetail(sessionId);
                }
            });
        });
    }

    deleteHistoryFromSidebar(sessionId) {
        this.pendingDeleteSessionId = sessionId;
        this.openDeleteConfirmModal();
    }

    onNewInterviewClick() {
        if (this.isInterviewActive) {
            if (!confirm('当前有面试正在进行中，确定要开始新的面试吗？')) {
                return;
            }
        }
        this.showInterviewPanel();
        this.resetInterviewPanel();
        this.showJobSelect();
        this.updateStatus('选择岗位并上传简历（可选），然后点击「开始面试」');
    }

    // ==================== 面板切换 ====================

    showInterviewPanel() {
        this.interviewPanel.classList.remove('hidden');
        this.detailPanel.classList.add('hidden');
        this.currentDetailSessionId = null;
        this.loadHistoryToSidebar();
    }

    resetInterviewPanel() {
        this.chatArea.innerHTML = '<div class="message system"><span class="role">🤖 系统</span><p>点击左侧「新的面试」开始模拟面试，或点击历史记录查看过往面试详情。</p></div>';
        this.startBtn.disabled = false;
        this.endBtn.disabled = true;
        this.hideReportButton();
        this.enableRecording(false);
    }

    showJobSelect() {
        if (this.jobSelectArea) {
            this.jobSelectArea.classList.remove('btn-hidden');
        }
    }

    hideJobSelect() {
        if (this.jobSelectArea) {
            this.jobSelectArea.classList.add('btn-hidden');
        }
    }

    async showHistoryDetail(sessionId) {
        try {
            const interview = await apiClient.getInterviewDetail(sessionId);
            this.currentDetailSessionId = sessionId;

            this.interviewPanel.classList.add('hidden');
            this.detailPanel.classList.remove('hidden');

            let detailHTML = '<div class="detail-messages">';
            interview.messages.forEach(msg => {
                const roleClass = msg.role === 'user' ? 'user' : 'assistant';
                const roleText = msg.role === 'user' ? '👤 您' : '🎯 面试官';
                detailHTML += `
                    <div class="message ${roleClass}">
                        <span class="role">${roleText}</span>
                        <p>${msg.content}</p>
                    </div>
                `;
            });
            detailHTML += '</div>';

            if (interview.summary) {
                detailHTML += `
                    <div class="detail-summary" style="text-align: center; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="app.viewHistoryReport('${sessionId}')">📄 查看面试报告</button>
                    </div>
                `;
            }

            this.detailContent.innerHTML = detailHTML;
            this.loadHistoryToSidebar();

        } catch (error) {
            console.error('获取详情失败:', error);
            this.updateStatus('获取面试详情失败', 'error');
        }
    }

    async viewHistoryReport(sessionId) {
        try {
            const interview = await apiClient.getInterviewDetail(sessionId);
            if (interview && interview.summary) {
                this.showReportButton(interview.summary);
                this.openSummaryReportModal();
            } else {
                this.updateStatus('未找到面试报告', 'error');
            }
        } catch (error) {
            console.error('获取面试报告失败:', error);
            this.updateStatus('获取面试报告失败', 'error');
        }
    }

    // ==================== 简历上传 ====================

    async onResumeFileSelected(event) {
        const file = event.target?.files?.[0];
        if (!file) return;

        if (this.resumeHint) {
            this.resumeHint.textContent = '解析中…';
        }
        this.updateStatus('正在解析简历…');

        try {
            const result = await apiClient.parseResume(file);
            const raw = result.text != null ? String(result.text) : '';
            const text = raw.trim();

            if (!text) {
                if (this.resumeHint) {
                    this.resumeHint.textContent = '未提取到文字（常见于扫描版 PDF）';
                }
                this.updateStatus('文件中未识别到文字，请换用可复制文本的 PDF 或 docx', 'error');
                return;
            }

            const name = result.filename || file.name;
            const extra = result.truncated ? '（已截断过长文本）' : '';
            
            await this.saveResumeToServer(text, name);

            if (this.resumeHint) {
                this.resumeHint.textContent = `${name}，约 ${text.length} 字${extra}`;
            }
            this.updateStatus('简历上传成功！点击「开始面试」即可开始');
        } catch (error) {
            console.error('简历解析失败:', error);
            if (this.resumeHint) {
                this.resumeHint.textContent = '解析失败，请使用 PDF 或 docx';
            }
            this.updateStatus('简历解析失败：' + (error.message || '请检查格式与网络'), 'error');
        }
    }

    // ==================== 面试流程 ====================

    onStartButtonClick() {
        if (this.isInterviewActive) {
            return;
        }
        this.startInterview();
    }

    async startInterview() {
        if (this.isInterviewActive) {
            return;
        }

        const jobRole = this.getSelectedJobRole();
        this.updateJobTitle(jobRole);

        this.updateStatus('正在开始面试...');
        this.startBtn.disabled = true;

        try {
            const result = await apiClient.startInterview('', jobRole);
            this.currentSessionId = result.session_id;
            this.isInterviewActive = true;

            this.showInterviewPanel();
            this.hideJobSelect();

            this.endBtn.disabled = false;
            this.enableRecording(false);

            this.hideReportButton();
            this.chatArea.innerHTML = '';

            this.addMessage('assistant', result.first_question);
            audioPlayer.speak(result.first_question);

            this.updateStatus('面试官正在说话，请稍等...');

        } catch (error) {
            console.error('开始面试失败:', error);
            this.updateStatus('开始面试失败：' + (error.message || '请检查后端服务'), 'error');
            this.startBtn.disabled = false;
        }
    }

    async toggleRecording() {
        if (!this.isInterviewActive) {
            this.updateStatus('请先开始面试', 'error');
            return;
        }

        if (this.isRecording) {
            audioRecorder.stopListening();
        } else {
            this.updateStatus('请开始说话...', 'info');
            const started = audioRecorder.startListening();
            if (started) {
                this.isRecording = true;
                this.recordBtn.textContent = '🔴 录音中... 点击停止';
                this.recordBtn.classList.add('recording');
            } else {
                this.updateStatus('无法启动麦克风，请检查权限', 'error');
            }
        }
    }

    async handleUserInput(text) {
        if (!this.isInterviewActive) {
            this.updateStatus('面试未开始', 'error');
            return;
        }

        if (!text || text.trim() === '') {
            this.updateStatus('未识别到有效内容，请重新说话', 'error');
            this.enableRecording(true);
            return;
        }

        this.addMessage('user', text);
        this.enableRecording(false);
        this.updateStatus('正在处理您的回答...');

        try {
            const reply = await apiClient.sendMessage(text);
            this.addMessage('assistant', reply);
            audioPlayer.speak(reply);
        } catch (error) {
            console.error('发送消息失败:', error);
            this.updateStatus('发送失败，请重试', 'error');
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
        if (!this.isInterviewActive) {
            return;
        }

        this.updateStatus('正在结束面试，生成总结...');
        this.enableRecording(false);
        this.endBtn.disabled = true;

        try {
            const summary = await apiClient.endInterview();

            this.addMessage(
                'system',
                '面试已结束。完整总结已生成，请点击下方「查看面试报告」查看。'
            );
            this.showReportButton(summary);

            this.isInterviewActive = false;
            this.startBtn.disabled = false;
            this.currentSessionId = null;

            await this.loadSavedResumeInfo();
            this.updateStatus('面试已结束，可查看报告或开始新的面试');
            await this.loadHistoryToSidebar();

        } catch (error) {
            console.error('结束面试失败:', error);
            this.updateStatus('结束面试失败', 'error');
            this.endBtn.disabled = false;
        }
    }

    // ==================== UI辅助 ====================

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const roleSpan = document.createElement('span');
        roleSpan.className = 'role';

        if (role === 'user') {
            roleSpan.textContent = '👤 您';
        } else if (role === 'assistant') {
            roleSpan.textContent = '🎯 面试官';
        } else {
            roleSpan.textContent = '🤖 系统';
        }

        const contentP = document.createElement('p');
        contentP.textContent = content;

        messageDiv.appendChild(roleSpan);
        messageDiv.appendChild(contentP);

        this.chatArea.appendChild(messageDiv);
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
    }

    enableRecording(enabled) {
        this.recordBtn.disabled = !enabled;
        this.manualInput.disabled = !enabled;
        this.sendBtn.disabled = !enabled;

        if (enabled) {
            this.updateStatus('可以说话了，点击"按住说话"按钮进行语音输入');
        } else {
            this.updateStatus('面试官正在说话，请稍等...');
        }
    }

    updateStatus(message, type = 'info') {
        this.statusDiv.textContent = message;
        this.statusDiv.style.color = type === 'error' ? '#dc2626' : '#495057';
    }

    hideReportButton() {
        this.lastSummaryText = '';
        if (this.summaryReportBody) {
            this.summaryReportBody.innerHTML = '';
        }
        if (this.viewReportBtn) {
            this.viewReportBtn.classList.add('btn-hidden');
            this.viewReportBtn.disabled = true;
        }
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
        if (this.viewReportBtn) {
            this.viewReportBtn.classList.remove('btn-hidden');
            this.viewReportBtn.disabled = false;
        }
    }

    openSummaryReportModal() {
        if (!this.summaryReportModal || !this.summaryReportBody) return;
        const raw = this.lastSummaryText || '';
        if (typeof renderInterviewSummaryHtml === 'function') {
            this.summaryReportBody.innerHTML = raw
                ? renderInterviewSummaryHtml(raw)
                : '<p class="report-empty">（暂无报告内容）</p>';
        } else {
            this.summaryReportBody.textContent = raw || '（暂无报告内容）';
        }
        this.summaryReportModal.style.display = 'block';
    }

    closeSummaryReportModal() {
        if (this.summaryReportModal) {
            this.summaryReportModal.style.display = 'none';
        }
    }

    downloadSummaryPdf() {
        if (typeof html2pdf === 'undefined') {
            this.updateStatus('PDF 组件未加载，请检查网络后刷新页面重试', 'error');
            return;
        }
        const el = this.summaryReportBody;
        if (!el || !String(el.textContent || '').trim()) {
            this.updateStatus('没有可下载的报告内容', 'error');
            return;
        }

        const filename = `面试总结报告_${new Date().toISOString().slice(0, 10)}.pdf`;
        const opt = {
            margin: 12,
            filename,
            image: { type: 'jpeg', quality: 0.92 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        };

        const prevMax = el.style.maxHeight;
        const prevOv = el.style.overflow;
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';

        const restore = () => {
            el.style.maxHeight = prevMax;
            el.style.overflow = prevOv;
        };

        const p = html2pdf().set(opt).from(el).save();
        if (p && typeof p.finally === 'function') {
            p.finally(restore);
        } else if (p && typeof p.then === 'function') {
            p.then(restore).catch(restore);
        } else {
            setTimeout(restore, 1500);
        }
    }

    deleteCurrentHistory() {
        if (!this.currentDetailSessionId) return;
        this.pendingDeleteSessionId = this.currentDetailSessionId;
        this.openDeleteConfirmModal();
    }

    openDeleteConfirmModal() {
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.style.display = 'block';
        }
    }

    closeDeleteConfirmModal() {
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.style.display = 'none';
        }
        this.pendingDeleteSessionId = null;
    }

    openClearResumeModal() {
        if (this.clearResumeModal) {
            this.clearResumeModal.style.display = 'block';
        }
    }

    closeClearResumeModal() {
        if (this.clearResumeModal) {
            this.clearResumeModal.style.display = 'none';
        }
    }

    async confirmClearResume() {
        this.closeClearResumeModal();
        try {
            await apiClient.deleteResume();
            await this.loadSavedResumeInfo();
            if (this.resumeHint) {
                this.resumeHint.textContent = '支持 PDF、Word（.docx）';
            }
            if (this.resumeFileInput) {
                this.resumeFileInput.value = '';
            }
            this.updateStatus('简历已清除', 'info');
        } catch (error) {
            console.error('清除简历失败:', error);
            this.updateStatus('清除简历失败', 'error');
        }
    }

    async confirmDelete() {
        const sessionId = this.pendingDeleteSessionId;
        this.closeDeleteConfirmModal();

        try {
            const result = await apiClient.deleteInterview(sessionId);

            if (result.success) {
                if (this.currentDetailSessionId === sessionId) {
                    this.showInterviewPanel();
                }
                await this.loadHistoryToSidebar();
                this.updateStatus('面试记录已删除', 'info');
            } else {
                this.updateStatus(result.message, 'error');
            }
        } catch (error) {
            console.error('删除失败:', error);
            this.updateStatus('删除失败', 'error');
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // ==================== 简历管理 ====================

    async loadSavedResumeInfo() {
        try {
            const info = await apiClient.getResumeInfo();
            this.updateResumeStatus(info);
        } catch (error) {
            console.error('加载保存的简历信息失败:', error);
            this.updateResumeStatus(null);
        }
    }

    async saveResumeToServer(text, filename = '') {
        try {
            await apiClient.saveResume(text, filename);
            await this.loadSavedResumeInfo();
        } catch (error) {
            console.error('保存简历失败:', error);
            throw error;
        }
    }

    

    updateResumeStatus(info) {
        if (!this.resumeStatusText) return;

        if (info && info.exists) {
            const name = info.filename || '简历';
            const count = info.char_count || 0;
            this.resumeStatusText.textContent = `${name}（${count}字）`;
            this.resumeStatusText.style.color = '#10b981';
            
            if (this.clearResumeBtn) {
                this.clearResumeBtn.classList.remove('btn-hidden');
                this.clearResumeBtn.disabled = false;
            }
        } else {
            this.resumeStatusText.textContent = '未上传';
            this.resumeStatusText.style.color = '#6b7280';
            
            if (this.clearResumeBtn) {
                this.clearResumeBtn.classList.add('btn-hidden');
                this.clearResumeBtn.disabled = true;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new InterviewApp();
});
