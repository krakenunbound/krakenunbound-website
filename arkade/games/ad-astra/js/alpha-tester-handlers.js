// Ad Astra - Alpha Tester UI Handlers
// alpha-tester-handlers.js - Handle alpha testing panel UI interactions

export class AlphaTesterHandlers {
    constructor(game) {
        this.game = game;
    }

    toggleAlphaTester() {
        const panel = document.getElementById('alpha-tester-panel');
        this.game.alphaTesterVisible = !this.game.alphaTesterVisible;

        if (this.game.alphaTesterVisible) {
            panel.classList.add('active');
            this.renderAlphaTester();
            this.game.audio.playSfx('click');
        } else {
            panel.classList.remove('active');
        }
    }

    renderAlphaTester() {
        const testList = document.getElementById('alpha-test-list');
        const completion = this.game.alphaTester.getCompletion();

        // Update completion percentage
        document.getElementById('alpha-completion').textContent = `${completion}% Complete`;

        let html = '';

        // Render each category
        for (const [categoryName, tests] of Object.entries(this.game.alphaTester.testCategories)) {
            // Count completion for this category
            const categoryTotal = tests.length;
            const categoryCompleted = tests.filter(test => this.game.alphaTester.getTest(test.id)).length;

            html += `
                <div class="test-category">
                    <div class="test-category-header" onclick="window.game.alphaHandlers.toggleCategory(this)">
                        <span class="test-category-name">${categoryName}</span>
                        <span class="test-category-count">${categoryCompleted}/${categoryTotal}</span>
                        <span class="test-category-arrow">▼</span>
                    </div>
                    <div class="test-items">
            `;

            // Render tests in category
            tests.forEach(test => {
                const result = this.game.alphaTester.getTest(test.id);
                const statusClass = result ? result.status : '';
                const notes = result ? result.notes : '';

                html += `
                    <div class="test-item ${statusClass}" data-test-id="${test.id}">
                        <div class="test-header">
                            <div class="test-name">${test.name}</div>
                            <div class="test-importance ${test.importance}">${test.importance}</div>
                        </div>
                        <div class="test-description">${test.test}</div>
                        <div class="test-expected">Expected: ${test.expected}</div>
                        <div class="test-actions">
                            <button class="test-btn test-btn-pass" onclick="window.game.alphaHandlers.recordTestResult('${test.id}', 'pass')">✅ Pass</button>
                            <button class="test-btn test-btn-fail" onclick="window.game.alphaHandlers.recordTestResult('${test.id}', 'fail')">❌ Fail</button>
                            <button class="test-btn test-btn-skip" onclick="window.game.alphaHandlers.recordTestResult('${test.id}', 'skip')">⏭️ Skip</button>
                        </div>
                        <div class="test-notes">
                            <textarea placeholder="Notes (required for fail/skip)..." onchange="window.game.alphaHandlers.updateTestNotes('${test.id}', this.value)">${notes}</textarea>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        testList.innerHTML = html;
    }

    toggleCategory(headerElement) {
        const category = headerElement.parentElement;
        category.classList.toggle('collapsed');
    }

    recordTestResult(testId, status) {
        const testItem = document.querySelector(`[data-test-id="${testId}"]`);
        const notesTextarea = testItem.querySelector('textarea');
        const notes = notesTextarea ? notesTextarea.value.trim() : '';

        // Require notes for fail/skip
        if ((status === 'fail' || status === 'skip') && !notes) {
            this.game.ui.showError('Please add notes explaining the issue');
            return;
        }

        // Record the test result
        this.game.alphaTester.recordTest(testId, status, notes);

        // Update UI
        testItem.classList.remove('pass', 'fail', 'skip');
        testItem.classList.add(status);

        // Update completion percentage
        const completion = this.game.alphaTester.getCompletion();
        document.getElementById('alpha-completion').textContent = `${completion}% Complete`;

        // Update category count
        const category = testItem.closest('.test-category');
        const categoryTests = category.querySelectorAll('.test-item');
        const categoryCompleted = category.querySelectorAll('.test-item.pass, .test-item.fail, .test-item.skip').length;
        const categoryCount = category.querySelector('.test-category-count');
        categoryCount.textContent = `${categoryCompleted}/${categoryTests.length}`;

        this.game.audio.playSfx('success');
    }

    updateTestNotes(testId, notes) {
        const result = this.game.alphaTester.getTest(testId);
        if (result) {
            this.game.alphaTester.recordTest(testId, result.status, notes);
        }
    }

    exportAlphaResults() {
        try {
            this.game.alphaTester.exportResults();
            this.game.ui.addMessage('Test results exported successfully', 'success');
            this.game.audio.playSfx('success');
        } catch (error) {
            this.game.ui.showError('Failed to export results: ' + error.message);
        }
    }

    clearAlphaResults() {
        if (!confirm('Clear all test results? This cannot be undone.')) {
            return;
        }

        this.game.alphaTester.clearResults();
        this.renderAlphaTester();
        this.game.ui.addMessage('All test results cleared', 'info');
    }
}

export default AlphaTesterHandlers;