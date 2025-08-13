document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const composer = document.getElementById('composer');
    const input = document.getElementById('user_question');
    const sendBtn = document.getElementById('send-btn');
    const resetBtn = document.getElementById('reset-btn');
    const attachBtn = document.getElementById('attach-btn');
    const excelInput = document.getElementById('excel_input');
    const fileChip = document.getElementById('file-chip');
        const landingHero = document.getElementById('landing-hero');
                const heroInput = document.getElementById('hero-input');
                const prefillNode = document.getElementById('prefill-data');

                if (!chatWindow || !composer) return;

    let hasSession = false;
    let typingNode = null;

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.innerText = str;
            return div.innerHTML;
        }

            // Lightweight Markdown fallback for bold/italic/code/links and newlines
            function mdFallback(src) {
                let s = escapeHtml(String(src || ''));
                // code spans
                s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
                // bold (**text**)
                s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                // italics (*text*) - avoid conflicting with bold
                s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
                // links [text](url)
                s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');
                // line breaks
                s = s.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>');
                return `<p>${s}</p>`;
            }

        function addMessage(role, content, options = {}) {
        const msg = document.createElement('div');
        msg.className = `message ${role}`;
                let safeContent;
                if (role === 'assistant') {
                    if (window.marked && window.DOMPurify) {
                        safeContent = window.DOMPurify.sanitize(window.marked.parse(String(content || '')));
                    } else {
                        // Fallback: minimal markdown
                        safeContent = mdFallback(content);
                    }
                } else {
                    safeContent = escapeHtml(String(content || ''));
                }
            msg.innerHTML = `
                <div class="avatar">${role === 'assistant' ? 'MM' : 'You'}</div>
                <div class="bubble">
                    ${options.status ? `<div class="status-pill">${options.status}</div>` : ''}
                    <div class="name">${role === 'assistant' ? 'ModelMind' : 'You'}</div>
                    <div class="content">${safeContent}</div>
                </div>
            `;
        chatWindow.appendChild(msg);
        scrollToBottom();
        return msg;
    }

    function showTyping() {
        removeTyping();
        const node = document.createElement('div');
        node.className = 'message assistant';
        node.innerHTML = `
            <div class="avatar">MM</div>
            <div class="bubble">
                <div class="name">ModelMind</div>
                <div class="content"><span class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></div>
            </div>`;
        chatWindow.appendChild(node);
        typingNode = node;
        scrollToBottom();
    }

    function removeTyping() {
        if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);
        typingNode = null;
    }

        function renderAnswer(answer, confirmation, tableHtml) {
            const parts = [];
            if (confirmation) parts.push(`<em>${escapeHtml(confirmation)}</em>`);
            if (answer) parts.push(String(answer)); // assistant content may be markdown
            if (tableHtml) parts.push(`<div class="mt-2">${tableHtml}</div>`);
            addMessage('assistant', parts.join('\n\n'));
        }

    function setFileChip(file) {
        if (!file) {
            fileChip.classList.add('d-none');
            fileChip.innerHTML = '';
            return;
        }
        fileChip.classList.remove('d-none');
        fileChip.innerHTML = `${file.name} <span class="remove" title="Remove">✕</span>`;
        fileChip.querySelector('.remove').onclick = () => {
            excelInput.value = '';
            setFileChip(null);
        };
    }

    function setSendingState(sending) {
        sendBtn.disabled = sending;
        input.disabled = sending;
        attachBtn.disabled = sending;
        resetBtn.disabled = sending;
        if (sending) sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Send';
        else sendBtn.innerHTML = 'Send';
    }

    // Session status to allow follow-ups without file
    function checkSessionStatus() {
        fetch('/status')
            .then(r => r.json())
            .then(data => {
                if (data.has_data) {
                    hasSession = true;
              hideLanding();
              addMessage('assistant', `We’re still working with “${data.filename}”. Ask a follow-up anytime.`, { status: 'Active session' });
                }
            })
            .catch(() => {});
    }

        checkSessionStatus();

        // Prefill question from /chat?q=...
        let prefillShown = false;
        let lastPrefillText = '';
        if (prefillNode) {
            const prefill = prefillNode.getAttribute('data-prefill') || '';
            if (prefill) {
                // Show as a user bubble immediately
                addMessage('user', prefill);
                input.value = prefill;
                prefillShown = true;
                lastPrefillText = prefill;
                input.focus();
            }
        }

            // If coming from Home after an upload, render the first answer immediately
            try {
                const stored = sessionStorage.getItem('prefillFirst');
                if (stored) {
                    const { q, data } = JSON.parse(stored);
                    // Avoid re-sending — just show what we already have
                    if (q && data) {
                        if (!prefillShown) addMessage('user', q);
                        renderAnswer(data.answer, data.confirmation, data.table_html);
                        // Establish session for follow-ups
                        hasSession = true;
                    }
                    sessionStorage.removeItem('prefillFirst');
                }
            } catch (_) { /* ignore */ }

    // Events
    attachBtn.addEventListener('click', () => excelInput.click());
        excelInput.addEventListener('change', () => setFileChip(excelInput.files[0]));
        if (heroInput) {
            heroInput.addEventListener('focus', () => hideLanding());
            heroInput.addEventListener('input', () => {
                // Move text into real composer as they type
                input.value = heroInput.value;
            });
            heroInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.value = heroInput.value;
                    heroInput.value = '';
                    composer.requestSubmit();
                }
            });
        }

        function hideLanding() {
            if (landingHero) landingHero.style.display = 'none';
        }

    resetBtn.addEventListener('click', () => {
        if (!confirm('This will clear your current session and let you upload a new file. Continue?')) return;
        setSendingState(true);
        fetch('/reset', { method: 'POST' })
            .then(() => {
                hasSession = false;
                setFileChip(null);
                addMessage('assistant', 'Session cleared. Please attach a new Excel file and ask your question.', { status: 'Reset complete' });
            })
            .catch(() => {
                addMessage('assistant', 'Could not reset the session. Please try again.', { status: 'Error' });
            })
            .finally(() => setSendingState(false));
    });

    composer.addEventListener('submit', (e) => {
        e.preventDefault();
        const question = input.value.trim();
        const file = excelInput.files[0];
        if (!question) return;

        // First turn requires file unless there's an active session
        if (!hasSession && !file) {
            addMessage('assistant', 'Please attach an Excel file (.xls or .xlsx) for the first message.');
            return;
        }

        hideLanding();
            // Avoid duplicating the prefill bubble on first submit
            if (!(prefillShown && question === lastPrefillText)) {
                addMessage('user', question);
            } else {
                prefillShown = false;
            }
        input.value = '';
        showTyping();
        setSendingState(true);

        // Decide endpoint
        const isFirstTurn = !hasSession;
        let request;
        if (isFirstTurn) {
            const fd = new FormData();
            fd.append('excel_file', file);
            fd.append('user_question', question);
            request = fetch('/upload', { method: 'POST', body: fd });
        } else {
            request = fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followup_question: question })
            });
        }

        request
            .then(r => r.json())
            .then(data => {
                removeTyping();
                if (data && (data.answer || data.confirmation || data.table_html)) {
                    renderAnswer(data.answer, data.confirmation, data.table_html);
                    hasSession = true; // any successful turn establishes session
                    // Clear file after first successful upload
                    if (excelInput.files.length) {
                        excelInput.value = '';
                        setFileChip(null);
                    }
                } else {
                    addMessage('assistant', data?.confirmation || 'Sorry, I couldn’t process that.');
                }
            })
            .catch(err => {
                console.error(err);
                removeTyping();
                addMessage('assistant', 'There was a network or server error. Please try again.');
            })
            .finally(() => setSendingState(false));
    });
});
