export const PROMPTS_SCREEN = String.raw`
  // ── SYSTEM PROMPTS SCREEN ──────────────────────────────────────
  var selectedPromptId = null;

  function renderPrompts(main) {
    loadPrompts().then(function(data) {
      state.prompts = data.prompts || [];
      main.innerHTML = buildPromptsShell();
      bindPromptsEvents();
      if (state.prompts.length > 0) {
        selectPrompt(state.prompts[0].id);
      }
    }).catch(function(err) {
      // If prompts endpoint doesn't exist yet, show empty state
      state.prompts = [];
      main.innerHTML = buildPromptsShell();
      bindPromptsEvents();
    });
  }

  function buildPromptsShell() {
    return (
      '<div class="mb-8">' +
        '<div class="flex items-center justify-between flex-wrap gap-4">' +
          '<div>' +
            '<h1 class="font-headline text-headline-lg text-on-surface">System Prompts</h1>' +
            '<p class="font-body text-body-md text-on-surface-variant mt-1">Manage pre-interaction and post-interaction prompt templates</p>' +
          '</div>' +
          '<button id="btn-new-prompt" class="btn-primary-gradient px-5 py-2.5 rounded-xl font-label text-label-lg flex items-center gap-2">' +
            icon('add', 'sm') + 'New Prompt' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div class="flex flex-col lg:flex-row gap-5">' +
        // Left: Prompt list + identity
        '<div class="lg:w-1/3 space-y-5">' +
          '<div id="prompt-identity" class="bg-surface-container-lowest rounded-2xl shadow-editorial p-6"></div>' +
          '<div id="prompt-versions" class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5"></div>' +
        '</div>' +

        // Right: Editors
        '<div class="lg:w-2/3 space-y-5">' +
          '<div id="prompt-editor-pre" class="bg-surface-container-lowest rounded-2xl shadow-editorial"></div>' +
          '<div id="prompt-editor-post" class="bg-surface-container-lowest rounded-2xl shadow-editorial"></div>' +
          '<div id="prompt-actions" class="flex items-center justify-between"></div>' +
        '</div>' +
      '</div>' +

      // Live status
      '<div class="fixed bottom-6 right-6 lg:bottom-6 lg:right-6 glass-panel rounded-xl px-4 py-2.5 shadow-float flex items-center gap-2 z-40 hidden lg:flex">' +
        '<span class="w-2 h-2 rounded-full bg-green-500 pulse-dot"></span>' +
        '<span class="font-label text-label-md text-on-surface-variant">System Live</span>' +
      '</div>'
    );
  }

  function bindPromptsEvents() {
    var newBtn = document.getElementById('btn-new-prompt');
    if (newBtn) {
      newBtn.addEventListener('click', showNewPromptModal);
    }

    if (state.prompts.length === 0) {
      document.getElementById('prompt-identity').innerHTML =
        '<div class="text-center py-8">' +
          icon('terminal', 'lg text-on-surface-variant/40') +
          '<p class="font-body text-body-md text-on-surface-variant mt-3">No prompts configured yet</p>' +
          '<p class="font-body text-body-sm text-on-surface-variant/70 mt-1">Create your first system prompt to get started</p>' +
        '</div>';
      document.getElementById('prompt-versions').innerHTML = '';
      document.getElementById('prompt-editor-pre').innerHTML = '';
      document.getElementById('prompt-editor-post').innerHTML = '';
      document.getElementById('prompt-actions').innerHTML = '';
    }
  }

  function selectPrompt(id) {
    selectedPromptId = id;
    var prompt = state.prompts.find(function(p) { return p.id === id; });
    if (!prompt) return;

    // Identity card
    var identity = document.getElementById('prompt-identity');
    if (identity) {
      identity.innerHTML =
        '<div class="flex items-center gap-2 mb-3">' +
          badge(prompt.isActive ? 'Active Agent' : 'Draft', prompt.isActive ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-surface-container-high text-on-surface-variant') +
          '<span class="font-label text-label-sm text-on-surface-variant">' + relativeTime(prompt.updatedAt) + '</span>' +
        '</div>' +
        '<h2 class="font-headline text-3xl font-bold text-on-surface mb-2">' + esc(prompt.name) + '</h2>' +
        '<p class="font-body text-body-md text-on-surface-variant mb-5">' + esc(prompt.type === 'pre_interaction' ? 'Pre-interaction system prompt' : 'Post-interaction synthesis') + '</p>' +
        '<div class="space-y-3">' +
          '<div class="bg-surface-container-low rounded-xl p-4">' +
            '<div class="font-label text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Model Context</div>' +
            '<div class="font-body text-body-md text-on-surface">' + esc(prompt.modelContext) + '</div>' +
          '</div>' +
          '<div class="bg-surface-container-low rounded-xl p-4">' +
            '<div class="font-label text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Temperature</div>' +
            '<div class="flex items-center gap-3">' +
              '<div class="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">' +
                '<div class="h-full bg-on-tertiary-container rounded-full" style="width:' + (prompt.temperature * 100) + '%"></div>' +
              '</div>' +
              '<span class="font-mono text-body-sm text-on-surface">' + prompt.temperature.toFixed(2) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Prompt list (if multiple)
        (state.prompts.length > 1 ?
          '<div class="mt-5 pt-5 space-y-2">' +
            '<div class="font-label text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">All Prompts</div>' +
            state.prompts.map(function(p) {
              var isSelected = p.id === id;
              return '<button onclick="selectPrompt(\'' + esc(p.id) + '\')" class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ' +
                (isSelected ? 'bg-surface-container-low' : 'hover:bg-surface-container-low/50') + '">' +
                '<span class="w-2 h-2 rounded-full ' + (p.isActive ? 'bg-green-500' : 'bg-surface-container-high') + '"></span>' +
                '<span class="font-body text-body-md ' + (isSelected ? 'font-medium text-on-surface' : 'text-on-surface-variant') + '">' + esc(p.name) + '</span>' +
              '</button>';
            }).join('') +
          '</div>' : '');
    }

    // Version history
    loadPromptHistory(id).then(function(data) {
      var versions = data.versions || [];
      var container = document.getElementById('prompt-versions');
      if (!container) return;
      container.innerHTML =
        '<h3 class="font-headline text-title-md text-on-surface mb-4">Version History</h3>' +
        (versions.length === 0 ? '<p class="font-body text-body-sm text-on-surface-variant">No versions yet</p>' :
          '<div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">' +
            versions.map(function(v, i) {
              var isActive = v.deployedAt != null;
              return '<div class="flex items-center gap-3 p-2.5 rounded-xl ' + (i === 0 ? 'bg-surface-container-low' : '') + '">' +
                '<span class="material-symbols-outlined sm ' + (isActive ? 'filled text-on-tertiary-container' : 'text-on-surface-variant') + '">check_circle</span>' +
                '<div class="flex-1">' +
                  '<div class="font-body text-body-sm font-medium text-on-surface">v' + v.version + (isActive ? ' — Deployed' : '') + '</div>' +
                  '<div class="font-label text-label-sm text-on-surface-variant">' + relativeTime(v.createdAt) + '</div>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>');
    });

    // Editor
    var editorPre = document.getElementById('prompt-editor-pre');
    if (editorPre) {
      editorPre.innerHTML =
        '<div class="flex items-center justify-between px-5 py-3 border-b border-outline-variant/10">' +
          '<div class="flex items-center gap-2">' +
            '<span class="w-2.5 h-2.5 rounded-full bg-on-primary-container"></span>' +
            '<span class="font-label text-label-lg text-on-surface">Prompt Content</span>' +
          '</div>' +
          '<div class="flex gap-1">' +
            '<button onclick="copyPromptContent()" class="p-2 rounded-lg hover:bg-surface-container-low transition-colors">' + icon('content_copy', 'sm text-on-surface-variant') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="p-5">' +
          '<textarea id="prompt-content" class="w-full min-h-[300px] code-editor bg-surface-container-highest rounded-xl p-4 ghost-border ghost-border-focus outline-none resize-y text-on-surface">' + esc(prompt.content) + '</textarea>' +
          '<div class="flex items-center justify-between mt-2">' +
            '<span id="prompt-char-count" class="font-mono text-label-sm text-on-surface-variant uppercase tracking-wider">' +
              prompt.content.length + ' chars | ' + prompt.content.split('\\n').length + ' lines</span>' +
          '</div>' +
        '</div>';

      // Update char count on input
      setTimeout(function() {
        var ta = document.getElementById('prompt-content');
        if (ta) {
          ta.addEventListener('input', function() {
            var cc = document.getElementById('prompt-char-count');
            if (cc) cc.textContent = ta.value.length + ' chars | ' + ta.value.split('\\n').length + ' lines';
          });
        }
      }, 50);
    }

    // Hide post editor (single editor for simplicity)
    var editorPost = document.getElementById('prompt-editor-post');
    if (editorPost) editorPost.innerHTML = '';

    // Actions
    var actions = document.getElementById('prompt-actions');
    if (actions) {
      actions.innerHTML =
        '<div class="flex gap-3">' +
          '<button onclick="renderScreen(\'prompts\')" class="text-on-surface-variant px-4 py-2.5 font-label text-label-lg hover:text-on-surface">Discard Changes</button>' +
        '</div>' +
        '<div class="flex gap-3">' +
          '<button onclick="saveCurrentPrompt()" class="bg-secondary-container text-on-secondary-container px-5 py-2.5 rounded-xl font-label text-label-lg hover:opacity-80">Save Draft</button>' +
          '<button onclick="deployCurrentPrompt()" class="btn-primary-gradient px-6 py-2.5 rounded-xl font-label text-label-lg shadow-editorial-lg flex items-center gap-2">' +
            icon('rocket_launch', 'sm') + 'Deploy v' + (prompt.version + 1) +
          '</button>' +
        '</div>';
    }
  }

  function copyPromptContent() {
    var ta = document.getElementById('prompt-content');
    if (ta) {
      navigator.clipboard.writeText(ta.value).then(function() { showToast('Copied to clipboard', 'success'); });
    }
  }

  function saveCurrentPrompt() {
    if (!selectedPromptId) return;
    var ta = document.getElementById('prompt-content');
    if (!ta) return;
    savePrompt(selectedPromptId, { content: ta.value }).then(function(data) {
      var idx = state.prompts.findIndex(function(p) { return p.id === selectedPromptId; });
      if (idx >= 0) state.prompts[idx] = data.prompt;
      showToast('Prompt saved', 'success');
      selectPrompt(selectedPromptId);
    }).catch(function(err) { showToast(err.message, 'error'); });
  }

  function deployCurrentPrompt() {
    if (!selectedPromptId) return;
    deployPrompt(selectedPromptId).then(function(data) {
      var idx = state.prompts.findIndex(function(p) { return p.id === selectedPromptId; });
      if (idx >= 0) state.prompts[idx] = data.prompt;
      showToast('Prompt deployed successfully', 'success');
      selectPrompt(selectedPromptId);
    }).catch(function(err) { showToast(err.message, 'error'); });
  }

  function showNewPromptModal() {
    var bodyHtml =
      '<div class="space-y-4">' +
        '<input id="new-prompt-name" type="text" placeholder="Prompt name" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
        '<select id="new-prompt-type" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border outline-none">' +
          '<option value="pre_interaction">Pre-Interaction</option>' +
          '<option value="post_interaction">Post-Interaction</option>' +
        '</select>' +
        '<input id="new-prompt-model" type="text" placeholder="Model context (e.g., Claude 3.5 Sonnet)" value="Claude 3.5 Sonnet" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
      '</div>';

    showModal('Create New Prompt', bodyHtml, [
      { id: 'modal-cancel', label: 'Cancel', style: 'text', onClick: closeModal },
      { id: 'modal-create', label: 'Create', style: 'primary', onClick: function() {
        var name = document.getElementById('new-prompt-name').value.trim();
        var type = document.getElementById('new-prompt-type').value;
        var model = document.getElementById('new-prompt-model').value.trim();
        if (!name) { showToast('Name is required', 'error'); return; }
        createPrompt({ name: name, type: type, content: '', modelContext: model || 'Claude 3.5 Sonnet', temperature: 0.7 }).then(function(data) {
          state.prompts.push(data.prompt);
          closeModal();
          showToast('Prompt created', 'success');
          selectPrompt(data.prompt.id);
        }).catch(function(err) { showToast(err.message, 'error'); });
      }},
    ]);
  }
`;
