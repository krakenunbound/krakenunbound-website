/**
 * Kraken Image Converter
 * Deep Sea Themed Image Conversion Tool
 */

class KrakenConverter {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.previewSection = document.getElementById('previewSection');
        this.previewImage = document.getElementById('previewImage');
        this.resultSection = document.getElementById('resultSection');
        this.formatOptions = document.getElementById('formatOptions');
        this.convertBtn = document.getElementById('convertBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.newConversionBtn = document.getElementById('newConversionBtn');
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityInput = document.getElementById('quality');
        this.qualityValue = document.getElementById('qualityValue');
        this.icoOptions = document.getElementById('icoOptions');

        this.currentFile = null;
        this.currentFormat = null;
        this.selectedOutputFormat = null;
        this.convertedBlob = null;
        this.originalFileName = null;

        // Supported formats with their MIME types
        this.formatInfo = {
            'png': { mime: 'image/png', ext: 'png', name: 'PNG', supportsTransparency: true },
            'jpg': { mime: 'image/jpeg', ext: 'jpg', name: 'JPEG', supportsTransparency: false, hasQuality: true },
            'jpeg': { mime: 'image/jpeg', ext: 'jpeg', name: 'JPEG', supportsTransparency: false, hasQuality: true },
            'webp': { mime: 'image/webp', ext: 'webp', name: 'WebP', supportsTransparency: true, hasQuality: true },
            'gif': { mime: 'image/gif', ext: 'gif', name: 'GIF', supportsTransparency: true },
            'bmp': { mime: 'image/bmp', ext: 'bmp', name: 'BMP', supportsTransparency: false },
            'ico': { mime: 'image/x-icon', ext: 'ico', name: 'ICO', supportsTransparency: true, isIcon: true },
            'svg': { mime: 'image/svg+xml', ext: 'svg', name: 'SVG', supportsTransparency: true, isVector: true },
            'tiff': { mime: 'image/tiff', ext: 'tiff', name: 'TIFF', supportsTransparency: true },
            'avif': { mime: 'image/avif', ext: 'avif', name: 'AVIF', supportsTransparency: true, hasQuality: true }
        };

        this.init();
    }

    init() {
        this.setupDragDrop();
        this.setupEventListeners();
    }

    setupDragDrop() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop zone when dragging over
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.remove('drag-over');
            }, false);
        });

        // Handle drop
        this.dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        }, false);

        // Click to upload
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
    }

    setupEventListeners() {
        this.clearBtn.addEventListener('click', () => this.reset());
        this.saveBtn.addEventListener('click', () => this.saveFile());
        this.newConversionBtn.addEventListener('click', () => this.reset());

        this.qualityInput.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value;
        });

        this.convertBtn.addEventListener('click', () => this.convert());
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFile(file) {
        // Check if it's an image
        if (!file.type.startsWith('image/') && !this.isImageByExtension(file.name)) {
            this.showError('Please drop an image file!');
            return;
        }

        this.currentFile = file;
        this.originalFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        this.currentFormat = this.detectFormat(file);

        // Add ripple effect
        this.dropZone.classList.add('ripple');
        setTimeout(() => this.dropZone.classList.remove('ripple'), 600);

        // Show preview
        this.showPreview(file);
    }

    isImageByExtension(filename) {
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'svg', 'tiff', 'tif', 'avif'];
        const ext = filename.split('.').pop().toLowerCase();
        return imageExtensions.includes(ext);
    }

    detectFormat(file) {
        // First try MIME type
        const mimeType = file.type.toLowerCase();

        for (const [format, info] of Object.entries(this.formatInfo)) {
            if (info.mime === mimeType) {
                return format;
            }
        }

        // Fallback to extension
        const ext = file.name.split('.').pop().toLowerCase();
        if (this.formatInfo[ext]) {
            return ext;
        }

        // Handle special cases
        if (ext === 'tif') return 'tiff';
        if (ext === 'jpe' || ext === 'jfif') return 'jpg';

        return ext;
    }

    showPreview(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            this.previewImage.src = e.target.result;

            // Get image dimensions
            const img = new Image();
            img.onload = () => {
                document.getElementById('fileDimensions').textContent = `${img.width} × ${img.height}px`;
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);

        // Update info
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileFormat').textContent = this.currentFormat.toUpperCase();
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);

        // Generate format options
        this.generateFormatOptions();

        // Show preview section
        this.previewSection.classList.remove('hidden');
        this.resultSection.classList.add('hidden');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateFormatOptions() {
        this.formatOptions.innerHTML = '';

        // Get available output formats (exclude current format)
        const availableFormats = Object.keys(this.formatInfo).filter(f => {
            // Don't show the same format as input
            if (f === this.currentFormat) return false;
            // Don't show jpeg if current is jpg and vice versa
            if ((f === 'jpeg' && this.currentFormat === 'jpg') ||
                (f === 'jpg' && this.currentFormat === 'jpeg')) return false;
            // Skip tiff for browser conversion (limited support)
            if (f === 'tiff') return false;
            // Skip svg (can't convert raster to vector easily)
            if (f === 'svg' && this.currentFormat !== 'svg') return false;
            return true;
        });

        availableFormats.forEach(format => {
            const btn = document.createElement('button');
            btn.className = 'format-btn';
            btn.textContent = this.formatInfo[format].name;
            btn.dataset.format = format;

            btn.addEventListener('click', () => this.selectFormat(format, btn));

            this.formatOptions.appendChild(btn);
        });

        // Reset button state
        this.convertBtn.disabled = true;
        this.convertBtn.querySelector('.btn-text').textContent = 'Select a format to convert';
        this.selectedOutputFormat = null;
    }

    selectFormat(format, btn) {
        // Remove selection from other buttons
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('selected'));

        // Select this button
        btn.classList.add('selected');
        this.selectedOutputFormat = format;

        // Show/hide ICO options
        if (format === 'ico') {
            this.icoOptions.classList.remove('hidden');
            this.qualitySlider.classList.add('hidden');
        } else {
            this.icoOptions.classList.add('hidden');

            // Show quality slider for formats that support it
            if (this.formatInfo[format].hasQuality) {
                this.qualitySlider.classList.remove('hidden');
            } else {
                this.qualitySlider.classList.add('hidden');
            }
        }

        // Enable convert button
        this.convertBtn.disabled = false;
        this.convertBtn.querySelector('.btn-text').textContent = `Convert to ${this.formatInfo[format].name}`;
    }

    async convert() {
        if (!this.selectedOutputFormat || !this.currentFile) return;

        this.convertBtn.classList.add('converting');

        try {
            if (this.selectedOutputFormat === 'ico') {
                this.convertedBlob = await this.convertToIco();
            } else {
                this.convertedBlob = await this.convertImage();
            }

            this.showResult();
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Conversion failed: ' + error.message);
        } finally {
            this.convertBtn.classList.remove('converting');
        }
    }

    async convertImage() {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');

                // For JPEG, fill with white background (no transparency support)
                if (!this.formatInfo[this.selectedOutputFormat].supportsTransparency) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                const quality = this.formatInfo[this.selectedOutputFormat].hasQuality
                    ? this.qualityInput.value / 100
                    : 1;

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    },
                    this.formatInfo[this.selectedOutputFormat].mime,
                    quality
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));

            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(this.currentFile);
        });
    }

    async convertToIco() {
        // Get selected sizes
        const selectedSizes = Array.from(
            this.icoOptions.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => parseInt(cb.value));

        if (selectedSizes.length === 0) {
            throw new Error('Please select at least one icon size');
        }

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = async () => {
                try {
                    const icoData = await this.createIcoFile(img, selectedSizes);
                    const blob = new Blob([icoData], { type: 'image/x-icon' });
                    resolve(blob);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));

            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(this.currentFile);
        });
    }

    async createIcoFile(img, sizes) {
        // ICO file format:
        // - ICONDIR header (6 bytes)
        // - ICONDIRENTRY for each image (16 bytes each)
        // - Image data (PNG format for each size)

        const images = [];

        // Generate PNG data for each size
        for (const size of sizes) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Calculate aspect ratio preserving dimensions
            const aspectRatio = img.width / img.height;
            let drawWidth, drawHeight, offsetX, offsetY;

            if (aspectRatio > 1) {
                drawWidth = size;
                drawHeight = size / aspectRatio;
                offsetX = 0;
                offsetY = (size - drawHeight) / 2;
            } else {
                drawWidth = size * aspectRatio;
                drawHeight = size;
                offsetX = (size - drawWidth) / 2;
                offsetY = 0;
            }

            // Clear with transparency
            ctx.clearRect(0, 0, size, size);

            // Draw image centered
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

            // Get PNG data
            const pngDataUrl = canvas.toDataURL('image/png');
            const pngBase64 = pngDataUrl.split(',')[1];
            const pngData = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));

            images.push({
                size: size,
                data: pngData
            });
        }

        // Calculate total file size
        const headerSize = 6;
        const entrySize = 16;
        const entriesSize = entrySize * images.length;
        let dataOffset = headerSize + entriesSize;

        const totalSize = dataOffset + images.reduce((sum, img) => sum + img.data.length, 0);
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        const uint8 = new Uint8Array(buffer);

        // Write ICONDIR header
        view.setUint16(0, 0, true);           // Reserved (0)
        view.setUint16(2, 1, true);           // Type (1 = ICO)
        view.setUint16(4, images.length, true); // Number of images

        // Write ICONDIRENTRY for each image
        let currentOffset = dataOffset;
        for (let i = 0; i < images.length; i++) {
            const entryOffset = headerSize + (i * entrySize);
            const image = images[i];

            // Width (0 means 256)
            view.setUint8(entryOffset + 0, image.size === 256 ? 0 : image.size);
            // Height (0 means 256)
            view.setUint8(entryOffset + 1, image.size === 256 ? 0 : image.size);
            // Color palette (0 for PNG)
            view.setUint8(entryOffset + 2, 0);
            // Reserved
            view.setUint8(entryOffset + 3, 0);
            // Color planes (1 for ICO)
            view.setUint16(entryOffset + 4, 1, true);
            // Bits per pixel (32 for RGBA)
            view.setUint16(entryOffset + 6, 32, true);
            // Image data size
            view.setUint32(entryOffset + 8, image.data.length, true);
            // Image data offset
            view.setUint32(entryOffset + 12, currentOffset, true);

            currentOffset += image.data.length;
        }

        // Write image data
        currentOffset = dataOffset;
        for (const image of images) {
            uint8.set(image.data, currentOffset);
            currentOffset += image.data.length;
        }

        return buffer;
    }

    showResult() {
        this.previewSection.classList.add('hidden');
        this.resultSection.classList.remove('hidden');

        const formatName = this.formatInfo[this.selectedOutputFormat].name;
        document.getElementById('resultMessage').textContent =
            `Your image has been successfully transformed to ${formatName} format!`;
    }

    async saveFile() {
        if (!this.convertedBlob) return;

        const ext = this.formatInfo[this.selectedOutputFormat].ext;
        // Ensure the filename always has the correct extension
        const baseFileName = this.originalFileName.replace(/\.[^/.]+$/, ''); // Remove any existing extension
        const suggestedName = `${baseFileName}.${ext}`;

        // Check if File System Access API is available
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedName,
                    types: [{
                        description: `${this.formatInfo[this.selectedOutputFormat].name} Image`,
                        accept: {
                            [this.formatInfo[this.selectedOutputFormat].mime]: [`.${ext}`]
                        }
                    }],
                    excludeAcceptAllOption: true // Force the specific file type
                });

                // Verify we got a file handle, not a directory
                const fileName = handle.name;

                // Check if the handle name has our expected extension
                // If not, the user may have navigated into a folder
                if (!fileName.toLowerCase().endsWith(`.${ext}`)) {
                    this.showError(`Please save as a .${ext} file. Make sure you're not selecting a folder.`);
                    return;
                }

                const writable = await handle.createWritable();
                await writable.write(this.convertedBlob);
                await writable.close();

                this.showSuccess('File saved successfully!');
            } catch (error) {
                if (error.name === 'AbortError') {
                    // User cancelled - do nothing
                    return;
                } else if (error.name === 'TypeMismatchError' || error.message.includes('directory')) {
                    // User selected a directory instead of a file
                    this.showError('Please select a file location, not a folder. Try using the fallback download.');
                    this.downloadFile(suggestedName);
                } else {
                    console.error('Save error:', error);
                    // Fallback to download
                    this.downloadFile(suggestedName);
                }
            }
        } else {
            // Fallback for browsers without File System Access API
            this.downloadFile(suggestedName);
        }
    }

    downloadFile(filename) {
        const url = URL.createObjectURL(this.convertedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showError(message) {
        // Simple alert for now - could be enhanced with a custom modal
        alert('🐙 ' + message);
    }

    showSuccess(message) {
        // Simple alert for now - could be enhanced with a custom modal
        alert('✨ ' + message);
    }

    reset() {
        this.currentFile = null;
        this.currentFormat = null;
        this.selectedOutputFormat = null;
        this.convertedBlob = null;
        this.originalFileName = null;

        this.previewImage.src = '';
        this.previewSection.classList.add('hidden');
        this.resultSection.classList.add('hidden');
        this.qualitySlider.classList.add('hidden');
        this.icoOptions.classList.add('hidden');

        this.fileInput.value = '';
        this.qualityInput.value = 92;
        this.qualityValue.textContent = '92';

        // Reset ICO checkboxes
        this.icoOptions.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
            cb.checked = i < 3; // Check first 3 by default
        });
    }
}

// Initialize the converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new KrakenConverter();
});
