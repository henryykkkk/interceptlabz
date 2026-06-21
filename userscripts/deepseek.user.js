// ==UserScript==
// @name         InterceptLabz - DeepSeek
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Injetor de prompts personalizados no DeepSeek
// @author       henryykkkk
// @match        https://chat.deepseek.com/*
// @icon         https://iili.io/CzPq3J9.png
// @grant        none
// @run-at       document-start
// ==/UserScript==


(function() {
    'use strict';

    const STORAGE_KEY = 'interceptlabz_deepseek_prompts';
    const ACTIVE_KEY = 'interceptlabz_deepseek_active';
    const TARGET_URL = '/api/v0/chat/completion';

    const loadPrompts = () => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
    };
    const savePrompts = (prompts) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    };
    const getActiveId = () => localStorage.getItem(ACTIVE_KEY);
    const setActiveId = (id) => {
        if (id) localStorage.setItem(ACTIVE_KEY, id);
        else localStorage.removeItem(ACTIVE_KEY);
    };
    const getActivePrompt = () => {
        const id = getActiveId();
        const prompts = loadPrompts();
        return prompts.find(p => p.id === id) || null;
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._intUrl = url;
        this._intMethod = method;
        return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function(body) {
        if (this._intUrl?.includes(TARGET_URL) && this._intMethod === 'POST') {
            const active = getActivePrompt();
            if (active && active.text) {
                try {
                    const data = JSON.parse(body);
                    if (data && typeof data.prompt === 'string') {
                        data.prompt = active.text + data.prompt;
                        console.log(`%cPrompt injetado: "${active.name}"`, 'color: #00ff88; font-weight: bold;');
                        body = JSON.stringify(data);
                    }
                } catch (e) {}
            }
        }
        return originalXHRSend.apply(this, [body]);
    };

    function createPanel() {
        const overlay = document.createElement('div');
        overlay.className = 'ds-modal-overlay';
        overlay.style.cssText = `
            pointer-events: all !important;
            z-index: 2147483646 !important;
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background-color: rgba(0, 0, 0, 0.36) !important;
            backdrop-filter: blur(2px) !important;
            -webkit-backdrop-filter: blur(2px) !important;
        `;

        const wrapper = document.createElement('div');
        wrapper.className = 'ds-modal-wrapper';
        wrapper.style.cssText = `
            z-index: 2147483647 !important;
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            padding: 16px 0 !important;
            display: flex !important;
            overflow: auto !important;
            pointer-events: none !important;
        `;

        const modal = document.createElement('div');
        modal.className = 'ds-modal';
        modal.style.cssText = `
            pointer-events: all !important;
            margin: auto !important;
            position: relative !important;
            z-index: 2147483647 !important;
        `;

        const content = document.createElement('div');
        content.className = 'ds-modal-content';
        content.style.cssText = `
            width: 525px !important;
            max-width: calc(100vw - 32px) !important;
            z-index: 2147483647 !important;
            position: relative !important;
        `;

        const header = document.createElement('div');
        header.className = 'ds-modal-content__header-wrapper';
        header.innerHTML = `
            <div class="ds-modal-content__title">🔬 <a href="https://github.com/henryykkkk/interceptlabz" target="_blank" style="color: inherit; text-decoration: none; font-weight: 600;">InterceptLabz</a></div>
            <button class="ds-modal-content__close ds-button ds-button--icon ds-button--borderless ds-button--iconLabelTertiary ds-button--s" id="ilz-close">
                <div class="ds-button__background"></div>
                <div class="ds-button__icon">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
            </button>
        `;

        const main = document.createElement('div');
        main.className = 'ds-modal-content__main';

        const warning = document.createElement('div');
        warning.className = 'ds-alert ds-alert--warning';
        warning.style.marginBottom = '16px';
        warning.style.display = 'none';
        warning.innerHTML = `
            <div class="ds-alert__icon">
                <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
                    <path d="M10.5 1L20 19H1L10.5 1Z" fill="currentColor"/>
                    <path d="M10.5 8V12M10.5 15V16" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="ds-alert__content"></div>
        `;

        const selectorLabel = document.createElement('div');
        selectorLabel.style.cssText = 'color: var(--dsw-alias-label-secondary); font-size: 14px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;';
        selectorLabel.innerHTML = `
            <span>Prompt ativo</span>
            <button id="ilz-new-prompt" class="ds-button ds-button--text ds-button--primary ds-button--s" style="font-size: 13px;">
                <div class="ds-button__background"></div>
                <div class="ds-button__content">➕ Novo Prompt</div>
            </button>
        `;

        const selector = document.createElement('select');
        selector.className = 'ds-select ds-select--filled ds-select--m';
        selector.style.marginBottom = '16px';

        const modeIndicator = document.createElement('div');
        modeIndicator.style.cssText = 'color: var(--dsw-alias-label-tertiary); font-size: 12px; margin-bottom: 8px; font-style: italic;';
        modeIndicator.textContent = '📝 Editando prompt existente';

        const textLabel = document.createElement('div');
        textLabel.style.cssText = 'color: var(--dsw-alias-label-secondary); font-size: 14px; margin-bottom: 6px;';
        textLabel.textContent = 'Texto para injetar antes da sua mensagem';

        const textarea = document.createElement('textarea');
        textarea.className = 'ds-textarea ds-textarea--bordered ds-textarea--hide-scrollbar';
        textarea.style.cssText = 'width: 100%; min-height: 120px; padding: 10px; font-family: inherit; font-size: 14px;';
        textarea.placeholder = 'Ex: [Responda sempre em português brasileiro]\n';

        const nameLabel = document.createElement('div');
        nameLabel.style.cssText = 'color: var(--dsw-alias-label-secondary); font-size: 14px; margin-bottom: 6px; margin-top: 12px;';
        nameLabel.textContent = 'Nome do prompt';

        const nameInput = document.createElement('input');
        nameInput.className = 'ds-input ds-input--bordered ds-input--m';
        nameInput.type = 'text';
        nameInput.placeholder = 'Ex: Modo Português';
        nameInput.style.marginBottom = '16px';

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'ds-modal-content__button-group';
        buttonGroup.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'ds-button ds-button--outlined ds-button--error ds-button--m';
        deleteBtn.innerHTML = '<div class="ds-button__background"></div><div class="ds-button__content">🗑️ Excluir</div>';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'ds-button ds-button--filled ds-button--primary ds-button--m';
        saveBtn.innerHTML = '<div class="ds-button__background"></div><div class="ds-button__content">💾 Salvar</div>';

        buttonGroup.appendChild(deleteBtn);
        buttonGroup.appendChild(saveBtn);

        main.appendChild(warning);
        main.appendChild(selectorLabel);
        main.appendChild(selector);
        main.appendChild(modeIndicator);
        main.appendChild(textLabel);
        main.appendChild(textarea);
        main.appendChild(nameLabel);
        main.appendChild(nameInput);
        main.appendChild(buttonGroup);

        content.appendChild(header);
        content.appendChild(main);
        modal.appendChild(content);
        wrapper.appendChild(modal);
        overlay.appendChild(wrapper);
        document.body.appendChild(overlay);

        let currentId = null;
        let activeIdAtOpen = getActiveId();
        let originalTextOfActive = '';
        let hasUnsavedChanges = false;

        function refreshSelector() {
            const prompts = loadPrompts();
            const activeId = getActiveId();
            selector.innerHTML = '<option value="">-- Nenhum prompt ativo --</option>';
            prompts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name + (p.id === activeId ? ' ✓ (ativo)' : '');
                selector.appendChild(opt);
            });
            selector.value = activeId || '';
        }

        function updateModeIndicator() {
            if (currentId) {
                modeIndicator.textContent = '📝 Editando prompt existente';
                modeIndicator.style.color = 'var(--dsw-alias-label-tertiary)';
                deleteBtn.style.display = '';
            } else {
                modeIndicator.textContent = '✨ Criando novo prompt';
                modeIndicator.style.color = 'var(--dsw-alias-brand-primary)';
                deleteBtn.style.display = 'none';
            }
        }

        function checkForWarnings() {
            const currentActive = getActiveId();

            if (currentActive !== activeIdAtOpen) {
                warning.style.display = 'flex';
                warning.querySelector('.ds-alert__content').innerHTML = `
                    <strong>Prompt ativo alterado!</strong> É recomendado <strong>recarregar a página</strong>.
                `;
                return;
            }

            if (currentActive && currentActive === activeIdAtOpen) {
                const currentPrompt = loadPrompts().find(p => p.id === currentActive);
                if (currentPrompt && currentPrompt.text !== originalTextOfActive) {
                    warning.style.display = 'flex';
                    warning.querySelector('.ds-alert__content').innerHTML = `
                        <strong>Texto do prompt ativo modificado!</strong> É recomendado <strong>recarregar a página</strong>.
                    `;
                    return;
                }
            }

            warning.style.display = 'none';
        }

        function loadCurrent() {
            const id = selector.value;
            if (!id) {
                currentId = null;
                textarea.value = '';
                nameInput.value = '';
                originalTextOfActive = '';
            } else {
                const p = loadPrompts().find(x => x.id === id);
                if (p) {
                    currentId = p.id;
                    textarea.value = p.text;
                    nameInput.value = p.name;
                    originalTextOfActive = (p.id === activeIdAtOpen) ? p.text : '';
                }
            }
            updateModeIndicator();
            checkForWarnings();
        }

        selector.addEventListener('change', () => {
            const newId = selector.value || null;
            setActiveId(newId);
            loadCurrent();
        });

        document.getElementById('ilz-new-prompt').addEventListener('click', () => {
            selector.value = '';
            currentId = null;
            textarea.value = '';
            nameInput.value = '';
            originalTextOfActive = '';
            hasUnsavedChanges = false;
            updateModeIndicator();
            textarea.focus();
        });

        textarea.addEventListener('input', () => { hasUnsavedChanges = true; });
        nameInput.addEventListener('input', () => { hasUnsavedChanges = true; });

        saveBtn.addEventListener('click', () => {
            const text = textarea.value;
            const name = nameInput.value.trim() || 'Sem nome';

            if (!text) {
                alert('O texto do prompt não pode estar vazio.');
                return;
            }

            let prompts = loadPrompts();

            if (currentId) {
                prompts = prompts.map(p => p.id === currentId ? { ...p, name, text } : p);
                console.log(`%cPrompt atualizado: "${name}"`, 'color: #ffaa00; font-weight: bold;');
            } else {
                const id = 'p_' + Date.now();
                prompts.push({ id, name, text });
                currentId = id;
                setActiveId(id);
                activeIdAtOpen = id;
                originalTextOfActive = text;
                console.log(`%cNovo prompt criado e ativado: "${name}"`, 'color: #00ff88; font-weight: bold;');
            }

            savePrompts(prompts);
            hasUnsavedChanges = false;
            refreshSelector();
            selector.value = currentId;
            updateModeIndicator();
            checkForWarnings();

            const orig = saveBtn.innerHTML;
            saveBtn.innerHTML = '<div class="ds-button__background"></div><div class="ds-button__content">✅ Salvo!</div>';
            setTimeout(() => { saveBtn.innerHTML = orig; }, 1200);
        });

        deleteBtn.addEventListener('click', () => {
            if (!currentId) return;
            const promptName = loadPrompts().find(p => p.id === currentId)?.name || 'este prompt';
            if (!confirm(`Excluir "${promptName}"?`)) return;

            let prompts = loadPrompts().filter(p => p.id !== currentId);
            savePrompts(prompts);

            if (getActiveId() === currentId) {
                setActiveId(null);
                activeIdAtOpen = null;
                originalTextOfActive = '';
            }

            currentId = null;
            hasUnsavedChanges = false;
            refreshSelector();
            loadCurrent();
        });

        const closePanel = () => {
            if (hasUnsavedChanges && !confirm('Você tem alterações não salvas. Fechar mesmo assim?')) {
                return;
            }
            overlay.remove();
        };

        document.getElementById('ilz-close').addEventListener('click', closePanel);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === wrapper) {
                closePanel();
            }
        });

        refreshSelector();
        loadCurrent();
    }

    function injectButton() {
        const container = document.querySelector('.ec4f5d61 > ._58b31c9');
        if (!container) return false;
        if (document.getElementById('ilz-trigger-btn')) return true;

        const btn = document.createElement('div');
        btn.id = 'ilz-trigger-btn';
        btn.className = 'f79352dc ds-toggle-button ds-toggle-button--m';
        btn.tabIndex = 0;
        btn.setAttribute('aria-pressed', 'false');
        btn.style.transform = 'translateZ(0px)';
        btn.title = 'InterceptLabz';
        btn.innerHTML = `
            <div class="ds-toggle-button__icon" style="font-size: 16px; line-height: 1;">🔬</div>
            <span class="_6dbc175">InterceptLabz</span>
            <div class="ds-focus-ring" style="--dsl-focus-ring-offset: -1px;"></div>
        `;
        btn.addEventListener('click', createPanel);
        container.appendChild(btn);
        return true;
    }

    const observer = new MutationObserver(() => {
        injectButton();
    });

    function startObserver() {
        observer.observe(document.documentElement, { childList: true, subtree: true });
        injectButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }

    console.log('%cRodando no DeepSeek', 'color: #00ff88; font-weight: bold;');
})();
