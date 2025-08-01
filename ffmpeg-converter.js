import { FFmpeg } from "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/ffmpeg.min.js";
import { fetchFile, toBlobURL } from "https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/util.min.js";

class FFmpegUniversalConverter {
    constructor() {
        this.files = [];
        this.ffmpeg = null;
        this.isLoaded = false;
        this.initializeEventListeners();
        this.loadFFmpeg();
    }

    async loadFFmpeg() {
        try {
            this.updateStatus('Loading FFmpeg...', 'loading');
            
            this.ffmpeg = new FFmpeg();

            // Set up logging
            this.ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg:', message);
                this.appendLog(message);
            });

            this.ffmpeg.on('progress', ({ progress }) => {
                if (progress > 0) {
                    this.updateProgress(progress * 100);
                }
            });

            // Load FFmpeg with proper CDN URLs
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            
            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            this.isLoaded = true;
            this.updateStatus('FFmpeg loaded successfully!', 'success');
            this.showUploadArea();
            
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            this.updateStatus('Failed to load FFmpeg', 'error');
            this.showFallbackOptions(error);
        }
    }

    updateStatus(message, type) {
        const statusElement = document.getElementById('ffmpegStatus');
        
        if (type === 'loading') {
            statusElement.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-cog fa-spin"></i>
                    <p>${message}</p>
                </div>
            `;
        } else if (type === 'success') {
            statusElement.innerHTML = `
                <div style="color: #28a745; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>${message}</p>
                </div>
            `;
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 2000);
        } else if (type === 'error') {
            statusElement.innerHTML = `
                <div class="error-message">
                    <h3><i class="fas fa-exclamation-triangle"></i> ${message}</h3>
                    <p>This can happen due to browser compatibility or network issues.</p>
                </div>
            `;
        }
    }

    showFallbackOptions(error) {
        const statusElement = document.getElementById('ffmpegStatus');
        statusElement.innerHTML += `
            <div class="fallback-options">
                <button class="fallback-btn" onclick="location.reload()">
                    <i class="fas fa-refresh"></i> Retry Loading
                </button>
                <a href="https://www.freeconvert.com/" target="_blank" class="fallback-btn">
                    <i class="fas fa-external-link-alt"></i> Use Online Converter
                </a>
                <button class="fallback-btn" onclick="window.converter.enableImageConverter()">
                    <i class="fas fa-image"></i> Image Converter Only
                </button>
            </div>
        `;
    }

    enableImageConverter() {
        this.isLoaded = true; // Enable for image conversion only
        this.showUploadArea();
        document.getElementById('ffmpegStatus').style.display = 'none';
        
        // Limit to image formats only
        const formatSelect = document.getElementById('outputFormat');
        formatSelect.innerHTML = `
            <optgroup label="Image Formats">
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
                <option value="bmp">BMP</option>
            </optgroup>
        `;
        
        // Update file input to accept images only
        document.getElementById('fileInput').accept = 'image/*';
        
        this.appendLog('Image converter mode enabled (no FFmpeg required)');
    }

    showUploadArea() {
        document.getElementById('uploadArea').style.display = 'block';
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const convertBtn = document.getElementById('convertBtn');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        convertBtn.addEventListener('click', this.convertFiles.bind(this));

        // Make converter available globally for fallback buttons
        window.converter = this;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        // Filter supported files
        this.files = files.filter(file => 
            file.type.startsWith('video/') || 
            file.type.startsWith('audio/') || 
            file.type.startsWith('image/')
        );
        
        if (this.files.length === 0) {
            alert('Please select video, audio, or image files only.');
            return;
        }

        this.updateUI();
        this.detectOptimalFormat(this.files[0]);
    }

    updateUI() {
        const conversionOptions = document.getElementById('conversionOptions');
        const uploadArea = document.getElementById('uploadArea');
        
        if (this.files.length > 0) {
            conversionOptions.style.display = 'block';
            uploadArea.innerHTML = `
                <i class="fas fa-check-circle" style="color: #28a745;"></i>
                <h3>${this.files.length} file(s) selected</h3>
                <p>${this.files.map(f => f.name).join(', ')}</p>
            `;
        }
    }

    detectOptimalFormat(file) {
        const fileType = file.type;
        const outputFormat = document.getElementById('outputFormat');
        
        if (fileType.startsWith('video/')) {
            outputFormat.value = 'mp4';
        } else if (fileType.startsWith('audio/')) {
            outputFormat.value = 'mp3';
        } else if (fileType.startsWith('image/')) {
            outputFormat.value = 'jpg';
        }
    }

    async convertFiles() {
        if (!this.isLoaded) {
            alert('FFmpeg is not loaded yet. Please wait or try refreshing.');
            return;
        }

        if (this.files.length === 0) return;

        const convertBtn = document.getElementById('convertBtn');
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');
        
        convertBtn.disabled = true;
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        
        this.clearLogs();

        try {
            const convertedFiles = [];
            
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                this.updateProgressText(`Converting ${file.name} (${i + 1}/${this.files.length})`);
                
                let convertedFile;
                
                // Check if FFmpeg is actually loaded for video/audio, fallback for images
                if ((file.type.startsWith('video/') || file.type.startsWith('audio/')) && this.ffmpeg) {
                    convertedFile = await this.convertWithFFmpeg(file);
                } else if (file.type.startsWith('image/')) {
                    convertedFile = await this.convertImageFallback(file);
                } else {
                    this.appendLog(`Skipping ${file.name} - unsupported without FFmpeg`);
                    continue;
                }
                
                if (convertedFile) {
                    convertedFiles.push(convertedFile);
                }
            }

            this.showResults(convertedFiles);
            
        } catch (error) {
            console.error('Conversion failed:', error);
            this.appendLog(`Error: ${error.message}`);
            alert('Conversion failed. Check the logs for details.');
        } finally {
            convertBtn.disabled = false;
            this.updateProgress(0);
        }
    }

    async convertWithFFmpeg(file) {
        const outputFormat = document.getElementById('outputFormat').value;
        const quality = document.getElementById('quality').value;
        const resolution = document.getElementById('resolution').value;

        const inputName = `input.${this.getFileExtension(file.name)}`;
        const outputName = `output.${outputFormat}`;

        try {
            // Write input file to FFmpeg file system
            await this.ffmpeg.writeFile(inputName, await fetchFile(file));

            // Build FFmpeg command
            const command = this.buildFFmpegCommand(inputName, outputName, file.type, outputFormat, quality, resolution);
            
            this.appendLog(`Running: ffmpeg ${command.join(' ')}`);

            // Execute conversion
            await this.ffmpeg.exec(command);

            // Read output file
            const data = await this.ffmpeg.readFile(outputName);
            
            // Clean up
            await this.ffmpeg.deleteFile(inputName);
            await this.ffmpeg.deleteFile(outputName);

            // Create blob
            const blob = new Blob([data.buffer], { type: this.getMimeType(outputFormat) });
            
            return {
                blob: blob,
                name: this.getOutputFileName(file.name, outputFormat),
                size: blob.size
            };

        } catch (error) {
            this.appendLog(`Error converting ${file.name}: ${error.message}`);
            throw error;
        }
    }

    async convertImageFallback(file) {
        const outputFormat = document.getElementById('outputFormat').value;
        const quality = document.getElementById('quality').value;

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const qualityValue = this.getImageQualityValue(quality);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({
                            blob: blob,
                            name: this.getOutputFileName(file.name, outputFormat),
                            size: blob.size
                        });
                    } else {
                        reject(new Error('Failed to convert image'));
                    }
                }, `image/${outputFormat}`, qualityValue);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    buildFFmpegCommand(inputName, outputName, inputType, outputFormat, quality, resolution) {
        let command = ['-i', inputName];

        // Quality settings
        if (inputType.startsWith('video/') && ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif'].includes(outputFormat)) {
            // Video conversion
            const crf = this.getCRF(quality);
            
            if (outputFormat === 'mp4') {
                command.push('-c:v', 'libx264', '-crf', crf.toString(), '-preset', 'medium', '-c:a', 'aac');
            } else if (outputFormat === 'webm') {
                command.push('-c:v', 'libvp9', '-crf', crf.toString(), '-c:a', 'libvorbis');
            } else if (outputFormat === 'gif') {
                command.push('-vf', 'fps=10,scale=320:-1:flags=lanczos', '-t', '10');
            } else {
                command.push('-c:v', 'libx264', '-crf', crf.toString());
            }

            // Resolution
            if (resolution !== 'original') {
                const scale = `scale=${resolution}`;
                if (command.includes('-vf')) {
                    const vfIndex = command.indexOf('-vf');
                    command[vfIndex + 1] = `${command[vfIndex + 1]},${scale}`;
                } else {
                    command.push('-vf', scale);
                }
            }

        } else if (inputType.startsWith('audio/') || ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'].includes(outputFormat)) {
            // Audio conversion
            const bitrate = this.getAudioBitrate(quality);
            
            if (outputFormat === 'mp3') {
                command.push('-vn', '-c:a', 'libmp3lame', '-b:a', bitrate);
            } else if (outputFormat === 'aac') {
                command.push('-vn', '-c:a', 'aac', '-b:a', bitrate);
            } else if (outputFormat === 'wav') {
                command.push('-vn', '-c:a', 'pcm_s16le');
            } else if (outputFormat === 'ogg') {
                command.push('-vn', '-c:a', 'libvorbis', '-q:a', '4');
            } else if (outputFormat === 'flac') {
                command.push('-vn', '-c:a', 'flac');
            }
        }

        // Add output filename
        command.push(outputName);

        return command;
    }

    getCRF(quality) {
        const crfMap = {
            'high': 18,
            'medium': 23,
            'low': 28,
            'ultralow': 32
        };
        return crfMap[quality] || 23;
    }

    getAudioBitrate(quality) {
        const bitrateMap = {
            'high': '320k',
            'medium': '192k',
            'low': '128k',
            'ultralow': '96k'
        };
        return bitrateMap[quality] || '192k';
    }

    getImageQualityValue(quality) {
        const qualityMap = {
            'high': 0.9,
            'medium': 0.7,
            'low': 0.5,
            'ultralow': 0.3
        };
        return qualityMap[quality] || 0.7;
    }

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    getOutputFileName(inputName, outputFormat) {
        const baseName = inputName.split('.').slice(0, -1).join('.');
        return `${baseName}.${outputFormat}`;
    }

    getMimeType(format) {
        const mimeTypes = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'mkv': 'video/x-matroska',
            'gif': 'image/gif',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
            'm4a': 'audio/m4a',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff'
        };
        return mimeTypes[format] || 'application/octet-stream';
    }

    showResults(files) {
        const resultsSection = document.getElementById('resultsSection');
        const downloadLinks = document.getElementById('downloadLinks');
        
        downloadLinks.innerHTML = '';
        
        files.forEach((file) => {
            const url = URL.createObjectURL(file.blob);
            const downloadItem = document.createElement('div');
            downloadItem.className = 'download-item';
            
            const fileSize = (file.size / (1024 * 1024)).toFixed(2);
            
            downloadItem.innerHTML = `
                <div>
                    <strong>${file.name}</strong>
                    <br>
                    <small>Size: ${fileSize} MB</small>
                </div>
                <a href="${url}" download="${file.name}" class="download-btn">
                    <i class="fas fa-download"></i> Download
                </a>
            `;
            
            downloadLinks.appendChild(downloadItem);
        });
        
        resultsSection.style.display = 'block';
    }

    updateProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${percent}%`;
    }

    updateProgressText(text) {
        const progressText = document.getElementById('progressText');
        progressText.textContent = text;
    }

    appendLog(message) {
        const logs = document.getElementById('ffmpegLogs');
        logs.textContent += message + '\n';
        logs.scrollTop = logs.scrollHeight;
    }

    clearLogs() {
        const logs = document.getElementById('ffmpegLogs');
        logs.textContent = '';
    }
}

// Initialize the converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FFmpegUniversalConverter();
});
