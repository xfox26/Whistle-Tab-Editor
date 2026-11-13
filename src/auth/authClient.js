/* ==========================================================================
   SISTEMA DE CONTAS, AUTENTICAÇÃO & PERFIL DO BARDO
   ========================================================================== */

import { t } from '../i18n/index.js';
import { showNotificationToast } from '../utils/toast.js';

export function createAuthController(ctx) {
    function updateUserButtonUI() {
        const currentBard = ctx.getCurrentBard();
        const userBtnLabel = document.getElementById('user-btn-label');
        const userAvatarBadge = document.getElementById('user-avatar-badge');
        const userIconSvg = document.getElementById('user-icon-svg');
        const shareAuthorInput = document.getElementById('share-author-input');

        if (currentBard) {
            const dName = currentBard.displayName || currentBard.display_name || currentBard.username || 'B';
            const initial = dName[0].toUpperCase();
            if (userAvatarBadge) {
                userAvatarBadge.textContent = initial;
                userAvatarBadge.style.display = 'inline-flex';
                if (currentBard.isAdmin) {
                    userAvatarBadge.style.boxShadow = '0 0 8px rgba(234, 179, 8, 0.8)';
                    userAvatarBadge.style.border = '1px solid #fde047';
                } else {
                    userAvatarBadge.style.boxShadow = 'none';
                    userAvatarBadge.style.border = 'none';
                }
            }
            if (userIconSvg) userIconSvg.style.display = 'none';
            if (userBtnLabel) {
                const shortName = dName.split(' ')[0];
                userBtnLabel.textContent = currentBard.isAdmin ? `👑 ${shortName} ▾` : `${shortName} ▾`;
            }
            if (shareAuthorInput && !shareAuthorInput.value) {
                shareAuthorInput.value = dName;
            }
        } else {
            if (userAvatarBadge) userAvatarBadge.style.display = 'none';
            if (userIconSvg) userIconSvg.style.display = 'inline-block';
            if (userBtnLabel) userBtnLabel.textContent = t('topbar.login');
        }
    }

    async function initAuth() {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            if (data.user) {
                const bard = {
                    ...data.user,
                    displayName: data.user.displayName || data.user.display_name || data.user.username,
                    isAdmin: Boolean(data.user.isAdmin || data.user.is_admin),
                    stats: data.stats || { tunesCount: 0, totalLikes: 0 }
                };
                ctx.setCurrentBard(bard);
                await ctx.loadUserLikes();
            } else {
                ctx.setCurrentBard(null);
                ctx.userLikedTuneIds.clear();
            }
            updateUserButtonUI();
            ctx.updateOfflineSyncIndicator();
            const currentSong = ctx.getCurrentSong();
            if (currentSong) {
                ctx.setEditorReadOnlyMode(ctx.isSongReadOnly(currentSong), currentSong);
            }
        } catch (e) {
            console.warn('[Auth] Não foi possível verificar sessão:', e);
            ctx.setCurrentBard(null);
            ctx.userLikedTuneIds.clear();
            updateUserButtonUI();
            ctx.updateOfflineSyncIndicator();
            const currentSong = ctx.getCurrentSong();
            if (currentSong) {
                ctx.setEditorReadOnlyMode(ctx.isSongReadOnly(currentSong), currentSong);
            }
        }
    }

    function setupAuthListeners() {
        const btnOpenUserModal = document.getElementById('btn-open-user-modal');
        const authModal = document.getElementById('auth-modal');
        const profileModal = document.getElementById('profile-modal');
        const btnCloseAuth = document.getElementById('btn-close-auth');
        const btnCloseProfile = document.getElementById('btn-close-profile');

        const tabAuthLogin = document.getElementById('tab-auth-login');
        const tabAuthRegister = document.getElementById('tab-auth-register');
        const formAuthLogin = document.getElementById('form-auth-login');
        const formAuthRegister = document.getElementById('form-auth-register');
        const authRegisterSuccess = document.getElementById('auth-register-success');
        const loginErrorMsg = document.getElementById('login-error-msg');
        const registerErrorMsg = document.getElementById('register-error-msg');
        const recoveryPhraseBox = document.getElementById('auth-recovery-phrase-box');
        const btnCopyRecoveryPhrase = document.getElementById('btn-copy-recovery-phrase');
        const btnFinishAuthSuccess = document.getElementById('btn-finish-auth-success');

        const formProfileEdit = document.getElementById('form-profile-edit');
        const profileEditName = document.getElementById('profile-edit-name');
        const profileViewDisplayname = document.getElementById('profile-view-displayname');
        const profileViewUsername = document.getElementById('profile-view-username');
        const profileAvatarLarge = document.getElementById('profile-avatar-large');
        const profileStatsTunes = document.getElementById('profile-stats-tunes-count');
        const profileStatsLikes = document.getElementById('profile-stats-likes-count');
        const profileAdminBadge = document.getElementById('profile-admin-badge');
        const profileUpdateMsg = document.getElementById('profile-update-msg');
        const btnProfileLogout = document.getElementById('btn-profile-logout');

        const openAuthTab = (tab) => {
            if (!tabAuthLogin || !tabAuthRegister) return;
            const isLogin = (tab === 'login');
            tabAuthLogin.classList.toggle('active', isLogin);
            tabAuthRegister.classList.toggle('active', !isLogin);
            if (formAuthLogin) formAuthLogin.style.display = isLogin ? 'block' : 'none';
            if (formAuthRegister) formAuthRegister.style.display = isLogin ? 'none' : 'block';
            if (authRegisterSuccess) authRegisterSuccess.style.display = 'none';
            if (loginErrorMsg) loginErrorMsg.style.display = 'none';
            if (registerErrorMsg) registerErrorMsg.style.display = 'none';
        };

        if (tabAuthLogin) tabAuthLogin.addEventListener('click', () => openAuthTab('login'));
        if (tabAuthRegister) tabAuthRegister.addEventListener('click', () => openAuthTab('register'));

        const openModal = () => {
            const currentBard = ctx.getCurrentBard();
            if (currentBard) {
                const dName = currentBard.displayName || currentBard.display_name || currentBard.username;
                if (profileViewDisplayname) profileViewDisplayname.textContent = dName;
                if (profileViewUsername) profileViewUsername.textContent = `@${currentBard.username}`;
                if (profileAvatarLarge) profileAvatarLarge.textContent = (dName || 'B')[0].toUpperCase();
                if (profileEditName) profileEditName.value = dName;
                if (profileStatsTunes) profileStatsTunes.textContent = currentBard.stats ? currentBard.stats.tunesCount : 0;
                if (profileStatsLikes) profileStatsLikes.textContent = `❤️ ${currentBard.stats ? currentBard.stats.totalLikes : 0}`;
                if (profileAdminBadge) {
                    profileAdminBadge.style.display = currentBard.isAdmin ? 'inline-block' : 'none';
                }
                if (profileUpdateMsg) profileUpdateMsg.style.display = 'none';
                if (profileModal) profileModal.style.display = 'flex';
            } else {
                openAuthTab('login');
                if (authModal) authModal.style.display = 'flex';
                setTimeout(() => {
                    const userInput = document.getElementById('login-username');
                    if (userInput) userInput.focus();
                }, 100);
            }
        };

        const closeModals = () => {
            if (authModal) authModal.style.display = 'none';
            if (profileModal) profileModal.style.display = 'none';
        };

        if (btnOpenUserModal) btnOpenUserModal.addEventListener('click', openModal);
        if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeModals);
        if (btnCloseProfile) btnCloseProfile.addEventListener('click', closeModals);

        [authModal, profileModal].forEach(m => {
            if (m) {
                m.addEventListener('click', (e) => {
                    if (e.target === m) closeModals();
                });
            }
        });

        // 1. Submit Login
        if (formAuthLogin) {
            formAuthLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                const btnSubmit = document.getElementById('btn-submit-login');

                if (loginErrorMsg) loginErrorMsg.style.display = 'none';
                if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = t('auth.signingIn'); }

                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ username, password })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || t('auth.loginErrorFallback'));

                    const bard = {
                        ...data.user,
                        displayName: data.user.displayName || data.user.display_name || data.user.username,
                        isAdmin: Boolean(data.user.isAdmin || data.user.is_admin),
                        stats: data.stats || { tunesCount: 0, totalLikes: 0 }
                    };
                    ctx.setCurrentBard(bard);
                    await ctx.loadUserLikes();
                    updateUserButtonUI();
                    ctx.updateOfflineSyncIndicator();
                    const currentSong = ctx.getCurrentSong();
                    if (currentSong) {
                        ctx.setEditorReadOnlyMode(ctx.isSongReadOnly(currentSong), currentSong);
                    }
                    closeModals();
                    ctx.renderSidebar();
                    ctx.syncOfflineTunes(false);

                    if (ctx.getPendingPublishAfterAuth()) {
                        ctx.setPendingPublishAfterAuth(false);
                        setTimeout(() => {
                            ctx.toggleSongVisibility();
                        }, 300);
                    }
                } catch (err) {
                    if (loginErrorMsg) {
                        loginErrorMsg.textContent = err.message;
                        loginErrorMsg.style.display = 'block';
                    }
                } finally {
                    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = t('auth.loginBtn'); }
                }
            });
        }

        // 2. Submit Cadastro
        if (formAuthRegister) {
            formAuthRegister.addEventListener('submit', async (e) => {
                e.preventDefault();
                const displayName = document.getElementById('register-displayname').value.trim();
                const username = document.getElementById('register-username').value.trim();
                const password = document.getElementById('register-password').value;
                const btnSubmit = document.getElementById('btn-submit-register');

                if (registerErrorMsg) registerErrorMsg.style.display = 'none';
                if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = t('auth.registering'); }

                try {
                    const res = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ displayName, username, password })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || t('auth.registerErrorFallback'));

                    const bard = {
                        ...data.user,
                        displayName: data.user.displayName || data.user.display_name || data.user.username,
                        isAdmin: Boolean(data.user.isAdmin || data.user.is_admin),
                        stats: data.stats || { tunesCount: 0, totalLikes: 0 }
                    };
                    ctx.setCurrentBard(bard);
                    await ctx.loadUserLikes();
                    updateUserButtonUI();
                    ctx.updateOfflineSyncIndicator();
                    const currentSong = ctx.getCurrentSong();
                    if (currentSong) {
                        ctx.setEditorReadOnlyMode(ctx.isSongReadOnly(currentSong), currentSong);
                    }
                    ctx.renderSidebar();
                    ctx.syncOfflineTunes(false);

                    if (formAuthRegister) formAuthRegister.style.display = 'none';
                    if (recoveryPhraseBox) recoveryPhraseBox.textContent = data.recoveryPhrase;
                    if (authRegisterSuccess) authRegisterSuccess.style.display = 'block';
                } catch (err) {
                    if (registerErrorMsg) {
                        registerErrorMsg.textContent = err.message;
                        registerErrorMsg.style.display = 'block';
                    }
                } finally {
                    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = t('auth.becomeBardBtn'); }
                }
            });
        }

        // 3. Copiar frase de recuperação
        if (btnCopyRecoveryPhrase && recoveryPhraseBox) {
            btnCopyRecoveryPhrase.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(recoveryPhraseBox.textContent.trim());
                    btnCopyRecoveryPhrase.textContent = t('auth.phraseCopiedSuccess');
                    setTimeout(() => { btnCopyRecoveryPhrase.textContent = t('auth.copyPhrase'); }, 2000);
                } catch (e) {
                    showNotificationToast(t('toasts.phraseCopied'));
                }
            });
        }

        if (btnFinishAuthSuccess) {
            btnFinishAuthSuccess.addEventListener('click', () => {
                closeModals();
                updateUserButtonUI();
                ctx.renderSidebar();

                if (ctx.getPendingPublishAfterAuth()) {
                    ctx.setPendingPublishAfterAuth(false);
                    setTimeout(() => {
                        ctx.toggleSongVisibility();
                    }, 300);
                }
            });
        }

        // 4. Editar nome de exibição no Perfil
        if (formProfileEdit) {
            formProfileEdit.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newName = profileEditName.value.trim();
                const btnSave = document.getElementById('btn-save-profile-name');

                if (profileUpdateMsg) profileUpdateMsg.style.display = 'none';
                if (btnSave) { btnSave.disabled = true; btnSave.textContent = t('profile.saving'); }

                try {
                    const res = await fetch('/api/auth/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ displayName: newName })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || t('profile.updateError'));

                    const currentBard = ctx.getCurrentBard();
                    if (currentBard) {
                        currentBard.displayName = data.user.display_name || data.user.displayName || newName;
                        if (profileViewDisplayname) profileViewDisplayname.textContent = currentBard.displayName;
                        if (profileAvatarLarge) profileAvatarLarge.textContent = (currentBard.displayName || 'B')[0].toUpperCase();
                    }
                    updateUserButtonUI();
                    ctx.renderSidebar();

                    if (profileUpdateMsg) {
                        profileUpdateMsg.textContent = t('profile.updateSuccess');
                        profileUpdateMsg.style.display = 'block';
                    }
                } catch (err) {
                    showNotificationToast(t('profile.saveError', { error: err.message }));
                } finally {
                    if (btnSave) { btnSave.disabled = false; btnSave.textContent = t('profile.saveBtn'); }
                }
            });
        }

        // 5. Logout
        if (btnProfileLogout) {
            btnProfileLogout.addEventListener('click', async () => {
                try {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                } catch (e) {}
                ctx.setCurrentBard(null);
                ctx.userLikedTuneIds.clear();
                updateUserButtonUI();
                ctx.updateOfflineSyncIndicator();
                const currentSong = ctx.getCurrentSong();
                if (currentSong) {
                    ctx.setEditorReadOnlyMode(ctx.isSongReadOnly(currentSong), currentSong);
                }
                closeModals();
                ctx.renderSidebar();
            });
        }
    }

    return {
        updateUserButtonUI,
        initAuth,
        setupAuthListeners
    };
}
