// 语音识别模块（使用Web Speech API）
class AudioRecorder {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onResult = null;
        this.onError = null;
        this.onEnd = null;
        this._init();
    }

    _init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('浏览器不支持 Web Speech API，语音输入不可用');
            return;
        }
        this._createRecognition();
    }

    _createRecognition() {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'zh-CN';
        this.recognition.maxAlternatives = 1;

        this._bindEvents();
    }

    _bindEvents() {
        var self = this;

        this.recognition.onresult = function (event) {
            try {
                var results = event.results;
                if (!results || !results.length) return;
                var firstResult = results[0];
                if (!firstResult || !firstResult.length) return;
                var result = firstResult[0].transcript;
                if (self.onResult) {
                    self.onResult(result);
                }
            } catch (e) {
                console.error('处理识别结果时出错:', e);
            }
        };

        this.recognition.onerror = function (event) {
            var error = event.error || 'unknown';
            console.error('语音识别错误:', error);
            self.isListening = false;
            if (error === 'aborted') {
                return;
            }
            if (self.onError) {
                self.onError(error);
            }
        };

        this.recognition.onend = function () {
            self.isListening = false;
            if (self.onEnd) {
                self.onEnd();
            }
        };
    }

    startListening() {
        if (!this.recognition) {
            this._init();
            if (!this.recognition) {
                console.error('语音识别未初始化');
                return false;
            }
        }

        if (this.isListening) {
            return false;
        }

        try {
            this.isListening = true;
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('启动语音识别失败:', error);
            this.isListening = false;
            this._resetRecognition();
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.error('停止语音识别失败:', e);
            }
            this.isListening = false;
        }
    }

    _resetRecognition() {
        try {
            if (this.recognition) {
                this.recognition.abort();
            }
        } catch (e) {}
        this._createRecognition();
        this.isListening = false;
    }
}

var audioRecorder = new AudioRecorder();