/* ==========================================================================
   CONTROLADOR DA BARRA LATERAL (BIBLIOTECA, FILTROS, PREVIEW, SETS & DEBOUNCE)
   ========================================================================== */

import { escapeHTML } from '../config/whistleData.js';
import { getTransposedFrequency, scheduleWhistleVoice } from '../audio/synthEngine.js';
import {
    getCachedSongTessitura,
    getSongMastery,
    findSetForSong,
    pickRandomTune
} from '../ui/libraryMastery.js';
import { t } from '../i18n/index.js';
import { showNotificationToast } from '../utils/toast.js';

export function createSidebarController(ctx) {
    let isSidebarFiltersOpen = false;
    let isSetModeActive = false;
    let currentPreviewSongId = null;
    let previewGainNode = null;
    let previewTimeout = null;
    let previewAudioElement = null;
    let listDelegationAttached = false;

    function stopSongPreview() {
        if (previewTimeout) {
            clearTimeout(previewTimeout);
            previewTimeout = null;
        }
        if (previewAudioElement) {
            try {
                previewAudioElement.pause();
                previewAudioElement.currentTime = 0;
            } catch (_) {}
            previewAudioElement = null;
        }
        const audioCtx = ctx.getAudioCtx();
        if (previewGainNode && audioCtx) {
            try {
                previewGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                previewGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                previewGainNode.disconnect();
            } catch (_) {}
            previewGainNode = null;
        }
        if (currentPreviewSongId) {
            const activePreviewBtns = document.querySelectorAll(`.btn-sidebar-preview[data-id="${currentPreviewSongId}"]`);
            activePreviewBtns.forEach(btn => {
                btn.classList.remove('playing');
                btn.title = t('sidebar.previewTitle');
                const iconPlay = btn.querySelector('.icon-pv-play');
                const iconStop = btn.querySelector('.icon-pv-stop');
                if (iconPlay) iconPlay.style.display = 'block';
                if (iconStop) iconStop.style.display = 'none';
            });
            currentPreviewSongId = null;
        }
    }

    async function synthesizeSongPreview(song) {
        if (!song || !song.notes || song.notes.length === 0) {
            stopSongPreview();
            return;
        }

        ctx.initAudio();
        const audioCtx = ctx.getAudioCtx();
        if (!audioCtx) return;

        if (audioCtx.state === 'suspended') {
            try {
                await audioCtx.resume();
            } catch (_) {}
        }

        if (currentPreviewSongId !== song.id) {
            return;
        }

        previewGainNode = audioCtx.createGain();
        previewGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);
        previewGainNode.connect(audioCtx.destination);

        const whistleKey = song.key || 'D';
        const bpm = song.tempo || 110;
        const beatSec = 60 / bpm;
        const now = audioCtx.currentTime + 0.05;

        let timeOffset = 0;
        const previewNotes = song.notes.slice(0, 20);
        let noteCount = 0;

        for (let i = 0; i < previewNotes.length; i++) {
            const n = previewNotes[i];
            if (['LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(n.note)) {
                continue;
            }

            const dur = (n.duration || 1) * beatSec;
            const noteName = n.note || n.key;
            if (noteName && noteName !== 'REST') {
                const freq = getTransposedFrequency(noteName, whistleKey);
                if (freq > 0) {
                    scheduleWhistleVoice(
                        audioCtx,
                        freq,
                        dur,
                        now + timeOffset,
                        n.ornament || null,
                        noteName,
                        whistleKey,
                        Boolean(n.slur),
                        previewGainNode
                    );
                }
            }
            timeOffset += dur;
            noteCount++;
            if (timeOffset >= 8.5 || noteCount >= 16) {
                break;
            }
        }

        if (timeOffset <= 0) {
            stopSongPreview();
            return;
        }

        previewTimeout = setTimeout(() => {
            stopSongPreview();
        }, (timeOffset + 0.2) * 1000);
    }

    async function startSongPreview(songId) {
        if (currentPreviewSongId === songId) {
            stopSongPreview();
            return;
        }

        stopSongPreview();

        const songs = ctx.getSongs();
        const allKnownSongs = [...songs, ...(window.communityTunesCache || []), ...(window.mySongsCache || [])];
        const targetSong = allKnownSongs.find(s => s && s.id === songId);
        if (!targetSong) return;

        currentPreviewSongId = songId;

        const activePreviewBtns = document.querySelectorAll(`.btn-sidebar-preview[data-id="${songId}"]`);
        activePreviewBtns.forEach(btn => {
            btn.classList.add('playing');
            btn.title = t('sidebar.stopPreviewTitle');
            const iconPlay = btn.querySelector('.icon-pv-play');
            const iconStop = btn.querySelector('.icon-pv-stop');
            if (iconPlay) iconPlay.style.display = 'none';
            if (iconStop) iconStop.style.display = 'block';
        });

        if (targetSong.audio_demo_url) {
            try {
                previewAudioElement = new Audio(targetSong.audio_demo_url);
                previewAudioElement.onended = () => stopSongPreview();
                previewAudioElement.onerror = () => {
                    synthesizeSongPreview(targetSong);
                };
                previewAudioElement.play().catch(() => {
                    synthesizeSongPreview(targetSong);
                });
                return;
            } catch (_) {
                synthesizeSongPreview(targetSong);
                return;
            }
        }

        if (!Array.isArray(targetSong.notes) || targetSong.notes.length === 0) {
            try {
                const res = await fetch(`/api/tunes/${encodeURIComponent(songId)}`, { credentials: 'include' });
                if (res.ok) {
                    const fullTune = await res.json();
                    targetSong.notes = Array.isArray(fullTune.notes) ? fullTune.notes : [];
                }
            } catch (_) {}
            if (currentPreviewSongId !== songId) return;
        }

        await synthesizeSongPreview(targetSong);
    }

    function handleRandomTunePick() {
        const songs = ctx.getSongs();
        const filtered = ctx.getCurrentFilteredSongs();
        const availableSongs = (filtered && filtered.length > 0) ? filtered : songs;
        const currentSong = ctx.getCurrentSong();
        const currentId = currentSong ? currentSong.id : null;
        const picked = pickRandomTune(availableSongs, currentId);
        if (!picked) return;

        if (!songs.some(s => s.id === picked.id)) {
            songs.unshift(picked);
        }

        ctx.selectSong(picked.id);
        showNotificationToast(t('toasts.randomPicked', { title: picked.title }));
    }

    function initSetModeControls() {
        if (ctx.btnSetModeToggle) {
            ctx.btnSetModeToggle.addEventListener('click', () => {
                isSetModeActive = !isSetModeActive;
                ctx.btnSetModeToggle.classList.toggle('active', isSetModeActive);
                if (ctx.btnNextSetTune) {
                    ctx.btnNextSetTune.style.display = isSetModeActive ? 'inline-flex' : 'none';
                }
                showNotificationToast(isSetModeActive ? t('sidebar.setModeBtn') + ' ✓' : t('sidebar.setModeBtn') + ' ✕');
            });
        }

        if (ctx.btnNextSetTune) {
            ctx.btnNextSetTune.addEventListener('click', () => {
                advanceToNextSetTune();
            });
        }
    }

    function advanceToNextSetTune() {
        const currentSong = ctx.getCurrentSong();
        if (!currentSong) return;

        const songs = ctx.getSongs();
        const filtered = ctx.getCurrentFilteredSongs();
        const setInfo = findSetForSong(currentSong.id);
        let nextTuneId = null;

        if (setInfo && setInfo.nextSongId) {
            nextTuneId = setInfo.nextSongId;
        } else {
            const availableSongs = (filtered && filtered.length > 0) ? filtered : songs;
            const currentIdx = availableSongs.findIndex(s => s.id === currentSong.id);
            if (currentIdx >= 0 && currentIdx < availableSongs.length - 1) {
                nextTuneId = availableSongs[currentIdx + 1].id;
            } else if (availableSongs.length > 0) {
                nextTuneId = availableSongs[0].id;
            }
        }

        if (nextTuneId) {
            const nextSongObj = songs.find(s => s.id === nextTuneId);
            const title = nextSongObj ? nextSongObj.title : nextTuneId;
            ctx.selectSong(nextTuneId);
            showNotificationToast(t('toasts.setAdvancing', { title }));
            if (isSetModeActive) {
                setTimeout(() => {
                    ctx.startPlayback();
                }, 600);
            }
        }
    }

    function updateActiveFiltersBadge() {
        const f = ctx.getFilters();
        let count = 0;
        if (f.selectedCategory !== 'all') count++;
        if (f.selectedDifficulty !== 'all') count++;
        if (f.selectedRhythm !== 'all') count++;
        if (f.selectedRange && f.selectedRange !== 'all') count++;
        if (f.selectedMastery && f.selectedMastery !== 'all') count++;
        if (f.currentSongSort && f.currentSongSort !== 'default') count++;

        if (ctx.activeFiltersBadge) {
            if (count > 0) {
                ctx.activeFiltersBadge.textContent = count;
                ctx.activeFiltersBadge.style.display = 'inline-flex';
            } else {
                ctx.activeFiltersBadge.style.display = 'none';
            }
        }
        if (ctx.btnResetFiltersQuick) {
            ctx.btnResetFiltersQuick.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    function toggleSidebarFilters() {
        isSidebarFiltersOpen = !isSidebarFiltersOpen;
        if (ctx.sidebarFiltersPanel) {
            ctx.sidebarFiltersPanel.style.display = isSidebarFiltersOpen ? 'flex' : 'none';
        }
        if (ctx.btnToggleFilters) {
            ctx.btnToggleFilters.classList.toggle('open', isSidebarFiltersOpen);
        }
    }

    function resetSidebarFilters() {
        ctx.setFilters({
            selectedCategory: 'all',
            selectedDifficulty: 'all',
            selectedRhythm: 'all',
            selectedRange: 'all',
            selectedMastery: 'all',
            currentSongSort: 'default'
        });
        if (ctx.searchInput) ctx.searchInput.value = '';
        if (ctx.filterDifficulty) ctx.filterDifficulty.value = 'all';
        if (ctx.filterRhythm) ctx.filterRhythm.value = 'all';
        if (ctx.filterRange) ctx.filterRange.value = 'all';
        if (ctx.filterMastery) ctx.filterMastery.value = 'all';
        if (ctx.sortSongsSelect) ctx.sortSongsSelect.value = 'default';

        document.querySelectorAll('.filter-pill').forEach(p => {
            if (p.dataset.category === 'all') p.classList.add('active');
            else p.classList.remove('active');
        });

        updateActiveFiltersBadge();
        renderSidebar();
    }

    function toggleSidebarCollapse() {
        const isCollapsed = ctx.sidebarEl ? ctx.sidebarEl.classList.contains('collapsed') : false;
        setSidebarCollapse(!isCollapsed);
    }

    function setSidebarCollapse(collapse) {
        if (!ctx.sidebarEl) return;

        if (collapse) {
            ctx.sidebarEl.classList.add('collapsed');
            if (ctx.btnSidebarFloatingOpen && window.innerWidth > 860) {
                ctx.btnSidebarFloatingOpen.style.display = 'inline-flex';
            }
            localStorage.setItem('sidebar_collapsed', 'true');
        } else {
            ctx.sidebarEl.classList.remove('collapsed');
            if (ctx.btnSidebarFloatingOpen) ctx.btnSidebarFloatingOpen.style.display = 'none';
            localStorage.setItem('sidebar_collapsed', 'false');
        }

        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 150);
    }

    function setupSidebarFiltersAndCollapse() {
        if (ctx.btnToggleFilters) {
            ctx.btnToggleFilters.addEventListener('click', toggleSidebarFilters);
        }
        if (ctx.btnResetFiltersQuick) {
            ctx.btnResetFiltersQuick.addEventListener('click', (e) => {
                e.stopPropagation();
                resetSidebarFilters();
            });
        }

        document.querySelectorAll('.filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                ctx.setFilters({ selectedCategory: pill.dataset.category || 'all' });
                updateActiveFiltersBadge();
                renderSidebar();
            });
        });

        if (ctx.filterDifficulty) {
            ctx.filterDifficulty.addEventListener('change', (e) => {
                ctx.setFilters({ selectedDifficulty: e.target.value });
                updateActiveFiltersBadge();
                renderSidebar();
            });
        }

        if (ctx.filterRhythm) {
            ctx.filterRhythm.addEventListener('change', (e) => {
                ctx.setFilters({ selectedRhythm: e.target.value });
                updateActiveFiltersBadge();
                renderSidebar();
            });
        }

        if (ctx.filterRange) {
            ctx.filterRange.addEventListener('change', (e) => {
                ctx.setFilters({ selectedRange: e.target.value });
                updateActiveFiltersBadge();
                renderSidebar();
            });
        }

        if (ctx.filterMastery) {
            ctx.filterMastery.addEventListener('change', (e) => {
                ctx.setFilters({ selectedMastery: e.target.value });
                updateActiveFiltersBadge();
                renderSidebar();
            });
        }

        if (ctx.btnRandomTune) {
            ctx.btnRandomTune.addEventListener('click', () => {
                handleRandomTunePick();
            });
        }

        if (ctx.btnResetFilters) {
            ctx.btnResetFilters.addEventListener('click', resetSidebarFilters);
        }

        if (ctx.btnToggleSidebarCollapse) {
            ctx.btnToggleSidebarCollapse.addEventListener('click', () => {
                if (window.innerWidth <= 860) {
                    ctx.setMobileSidebarOpen(false);
                } else {
                    toggleSidebarCollapse();
                }
            });
        }

        if (ctx.btnSidebarFloatingOpen) {
            ctx.btnSidebarFloatingOpen.addEventListener('click', () => {
                setSidebarCollapse(false);
            });
        }

        updateActiveFiltersBadge();
    }

    function setupSidebarListDelegation() {
        const songListEl = ctx.songListEl;
        if (!songListEl || listDelegationAttached) return;
        listDelegationAttached = true;

        songListEl.addEventListener('click', async (e) => {
            const emptyResetBtn = e.target.closest('.btn-sidebar-empty-reset');
            if (emptyResetBtn) {
                resetSidebarFilters();
                return;
            }

            const li = e.target.closest('.song-item');
            // Itens de "Minhas Músicas" e "Comunidade" mantêm handlers assíncronos próprios
            if (!li || li.classList.contains('my-song-item') || li.classList.contains('community-song-item')) {
                return;
            }

            const songId = li.dataset.id;
            if (!songId) return;

            const btnFav = e.target.closest('.btn-fav-star');
            if (btnFav) {
                ctx.toggleFavorite(songId, e);
                return;
            }

            const btnPv = e.target.closest('.btn-sidebar-preview');
            if (btnPv) {
                e.stopPropagation();
                startSongPreview(songId);
                return;
            }

            const btnLike = e.target.closest('.btn-like-community');
            if (btnLike) {
                e.stopPropagation();
                ctx.handleToggleLike(songId, btnLike);
                return;
            }

            const adminDel = e.target.closest('.btn-admin-delete-tune');
            if (adminDel) {
                e.stopPropagation();
                const songTitle = adminDel.dataset.title;
                if (!confirm(t('confirms.deleteTunePermanent', { title: songTitle }))) {
                    return;
                }
                try {
                    const delRes = await fetch(`/api/tunes/${songId}`, { method: 'DELETE', credentials: 'include' });
                    const delData = await delRes.json();
                    if (!delRes.ok) throw new Error(delData.error || 'Erro ao excluir');
                    showNotificationToast(t('toasts.deleteSuccess'));
                    const songs = ctx.getSongs();
                    const idx = songs.findIndex(s => s.id === songId);
                    if (idx !== -1) songs.splice(idx, 1);
                    li.remove();
                } catch (err) {
                    showNotificationToast(t('toasts.deleteError', { error: err.message }));
                }
                return;
            }

            const btnDel = e.target.closest('.btn-icon.delete, .btn-icon.reset');
            if (btnDel) {
                ctx.deleteSong(songId, e);
                return;
            }

            ctx.selectSong(songId);
        });
    }

    function renderSidebar() {
        updateActiveFiltersBadge();
        const query = (ctx.searchInput && ctx.searchInput.value ? ctx.searchInput.value : '').toLowerCase().trim();
        const f = ctx.getFilters();

        if (f.selectedCategory === 'community') {
            ctx.fetchAndRenderCommunityTunes(query);
            return;
        }

        if (f.selectedCategory === 'my-songs') {
            ctx.fetchAndRenderMyCloudAndLocalTunes(query);
            return;
        }

        const songListEl = ctx.songListEl;
        const songs = ctx.getSongs();
        const currentSong = ctx.getCurrentSong();
        const currentBard = ctx.getCurrentBard();
        songListEl.innerHTML = '';

        const filteredSongs = songs.filter(s => {
            const matchesQuery = !query ||
                (s.title && s.title.toLowerCase().includes(query)) ||
                (s.artist && s.artist.toLowerCase().includes(query)) ||
                (s.rhythm && s.rhythm.toLowerCase().includes(query));

            let matchesCategory = true;
            if (f.selectedCategory === 'favorites') matchesCategory = ctx.favoriteSongIds.has(s.id);
            else if (f.selectedCategory === 'celtic') matchesCategory = (s.category === 'celtic');
            else if (f.selectedCategory === 'pop') matchesCategory = (s.category === 'pop');
            else if (f.selectedCategory === 'rock') matchesCategory = (s.category === 'rock');
            else if (f.selectedCategory === 'anime') matchesCategory = (s.category === 'anime');
            else if (f.selectedCategory === 'other') matchesCategory = (s.category === 'other');
            else if (f.selectedCategory === 'my-songs') matchesCategory = (!s.isCurated || s.isUserModified);

            let matchesDifficulty = true;
            if (f.selectedDifficulty !== 'all') {
                matchesDifficulty = (s.difficulty === f.selectedDifficulty);
            }

            let matchesRhythm = true;
            if (f.selectedRhythm !== 'all') {
                matchesRhythm = (s.rhythm === f.selectedRhythm);
            }

            let matchesRange = true;
            if (f.selectedRange !== 'all') {
                const tess = getCachedSongTessitura(s);
                if (f.selectedRange === 'octave1') matchesRange = (tess.rangeType === 'octave1');
                else if (f.selectedRange === 'octave1-2') matchesRange = (tess.rangeType === 'octave1-2');
                else if (f.selectedRange === 'half-hole') matchesRange = tess.hasHalfHole;
            }

            let matchesMastery = true;
            if (f.selectedMastery !== 'all') {
                const mastery = getSongMastery(s.id);
                const effectiveStatus = (mastery && mastery.status) ? mastery.status : 'learning';
                matchesMastery = (effectiveStatus === f.selectedMastery);
            }

            return matchesQuery && matchesCategory && matchesDifficulty && matchesRhythm && matchesRange && matchesMastery;
        });

        ctx.setCurrentFilteredSongs(filteredSongs);

        if (ctx.songsCountBadge) {
            ctx.songsCountBadge.textContent = t('sidebar.resultsCount', { shown: filteredSongs.length, total: songs.length });
        }

        if (ctx.btnResetFilters) {
            const hasFilters = (query || f.selectedCategory !== 'all' || f.selectedDifficulty !== 'all' || f.selectedRhythm !== 'all' || f.selectedRange !== 'all' || f.selectedMastery !== 'all');
            ctx.btnResetFilters.style.display = hasFilters ? 'inline' : 'none';
        }

        if (filteredSongs.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.style.padding = '20px 12px';
            emptyLi.style.textAlign = 'center';
            emptyLi.style.color = 'var(--text-muted)';
            emptyLi.style.fontSize = '0.85rem';
            emptyLi.innerHTML = `
                <p>${t('sidebar.emptySearch')}</p>
                <button class="btn btn-secondary btn-sm btn-sidebar-empty-reset" style="margin-top: 10px;">${t('sidebar.clearFiltersBtn')}</button>
            `;
            songListEl.appendChild(emptyLi);
            return;
        }

        const diffWeights = { 'iniciante': 1, 'intermediario': 2, 'avancado': 3 };
        filteredSongs.sort((a, b) => {
            if (f.currentSongSort === 'popular') {
                return (b.likes || 0) - (a.likes || 0);
            } else if (f.currentSongSort === 'remixes') {
                return (b.remix_count || 0) - (a.remix_count || 0) || (b.likes || 0) - (a.likes || 0);
            } else if (f.currentSongSort === 'title-asc') {
                return (a.title || '').localeCompare(b.title || '', 'pt-BR');
            } else if (f.currentSongSort === 'title-desc') {
                return (b.title || '').localeCompare(a.title || '', 'pt-BR');
            } else if (f.currentSongSort === 'key') {
                return (a.key || 'D').localeCompare(b.key || 'D');
            } else if (f.currentSongSort === 'difficulty-asc') {
                return (diffWeights[a.difficulty] || 1) - (diffWeights[b.difficulty] || 1);
            } else if (f.currentSongSort === 'difficulty-desc') {
                return (diffWeights[b.difficulty] || 1) - (diffWeights[a.difficulty] || 1);
            }
            return 0;
        });

        const fragment = document.createDocumentFragment();
        const rhythmNames = {
            'jig': t('rhythms.jig'),
            'reel': t('rhythms.reel'),
            'waltz': t('rhythms.waltz'),
            'polka': t('rhythms.polka'),
            'air': t('rhythms.air'),
            'soundtrack': t('rhythms.soundtrack')
        };

        filteredSongs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'song-item';
            if (currentSong && song.id === currentSong.id) {
                li.classList.add('active');
            }
            li.dataset.id = song.id;

            let catLabel = t('sidebar.filterCeltic');
            let catClass = 'tag-celtic';
            if (song.isCommunity) {
                catLabel = t('sidebar.filterCommunity');
                catClass = 'tag-community';
            } else if (song.category === 'pop') {
                catLabel = t('sidebar.filterMovies');
                catClass = 'tag-pop';
            } else if (song.category === 'rock') {
                catLabel = t('sidebar.filterRock');
                catClass = 'tag-rock';
            } else if (song.category === 'anime') {
                catLabel = t('sidebar.filterAnime');
                catClass = 'tag-anime';
            } else if (song.category === 'other') {
                catLabel = t('editor.catOtherOpt');
                catClass = 'tag-other';
            } else if (song.category === 'traditional') {
                catLabel = t('sidebar.catFolklore');
                catClass = 'tag-traditional';
            }

            const isCuratedSong = Boolean(song.isCurated || song.is_curated);
            if (!isCuratedSong && !song.isCommunity) {
                catLabel = t('sidebar.badgeMy');
                catClass = 'tag-mysong';
            } else if (song.isUserModified) {
                catLabel = t('sidebar.badgeEdited');
                catClass = 'tag-mysong';
            }

            let diffLabel = '★☆☆';
            if (song.difficulty === 'intermediario') diffLabel = '★★☆';
            else if (song.difficulty === 'avancado') diffLabel = '★★★';

            const rhythmLabel = rhythmNames[song.rhythm] || song.timeSignature || '';
            const isFav = ctx.favoriteSongIds.has(song.id);
            const hasLiked = ctx.userLikedTuneIds.has(song.id);
            const heartIcon = hasLiked ? '❤️' : '🤍';

            let authorMeta = song.author_name ? t('sidebar.byAuthor', { author: escapeHTML(song.author_name) }) : '';
            if (song.parent_author) {
                authorMeta += t('sidebar.variationOf', { parent: escapeHTML(song.parent_author) });
            }

            const isLocalOnly = !isCuratedSong && !song.isCommunity && (song.syncStatus === 'pending' || !song.isCloud);
            const isRemixTune = Boolean(song.parent_id || song.parent_author);
            const isUserSong = !isCuratedSong && !song.isCommunity;
            const isPublicSong = Number(song.is_public) === 1;
            const visBadgeHtml = isUserSong ? (
                isPublicSong
                    ? `<span class="badge-tag tag-vis-public" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.35);" title="${escapeHTML(t('toasts.madePublic'))}">${t('sidebar.badgePublic')}</span>`
                    : `<span class="badge-tag tag-vis-private" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.35);" title="${escapeHTML(t('toasts.madePrivate'))}">${t('sidebar.badgePrivate')}</span>`
            ) : '';

            let actionsHtml = '';
            if (song.isCommunity) {
                const canAdmin = Boolean(currentBard && currentBard.isAdmin);
                const adminBtn = canAdmin ? `
                    <button type="button" class="btn-admin-delete-tune" data-id="${song.id}" data-title="${escapeHTML(song.title)}" title="[Admin] ${escapeHTML(t('sidebar.deleteTuneTitle'))}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: #f87171; padding: 3px 6px; font-size: 0.75rem; cursor: pointer;">
                        🗑️
                    </button>
                ` : '';
                actionsHtml = `
                    <button type="button" class="btn-like-community ${hasLiked ? 'liked' : ''}" data-id="${song.id}" title="${hasLiked ? t('sidebar.unlikeTitle') : t('sidebar.likeTitle')}" style="background: ${hasLiked ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0,0,0,0.3)'}; border: 1px solid ${hasLiked ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255,255,255,0.1)'}; border-radius: 6px; color: #f43f5e; padding: 3px 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                        ${heartIcon} <span class="like-count">${song.likes || 0}</span>
                    </button>
                    ${adminBtn}
                `;
            } else if (!isCuratedSong) {
                actionsHtml = `
                    <button class="btn-icon delete" title="${t('sidebar.deleteTuneTitle')}">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
            } else if (song.isUserModified) {
                actionsHtml = `
                    <button class="btn-icon reset" title="${t('sidebar.restoreOriginalTitle')}">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                    </button>
                `;
            } else {
                actionsHtml = `
                    <span title="${t('sidebar.curatedOfficial')}" style="color: var(--gold-primary); font-size: 13px; opacity: 0.6; padding-right: 4px;">✓</span>
                `;
            }

            const tess = getCachedSongTessitura(song);
            const mastery = getSongMastery(song.id);

            const rangeBadgeHtml = tess.rangeType === 'octave1'
                ? `<span class="badge-range-oct1" title="${escapeHTML(t('sidebar.badgeOctave1'))}">${t('sidebar.badgeOctave1')}</span>`
                : `<span class="badge-range-oct12" title="${escapeHTML(t('sidebar.badgeOctave12'))}">${t('sidebar.badgeOctave12')}</span>`;
            const halfHoleBadgeHtml = tess.hasHalfHole
                ? `<span class="badge-half-hole" title="${escapeHTML(t('sidebar.badgeHalfHole'))}">${t('sidebar.badgeHalfHole')}</span>`
                : '';
            const measuresBadgeHtml = `<span class="badge-measures" title="${t('sidebar.measureCount', { count: tess.measuresCount })} • ${tess.durationFormatted}">📏 ${tess.measuresCount}c • ${tess.durationFormatted}</span>`;

            let masteryBadgeHtml = '';
            if (mastery && mastery.status) {
                let mLabel = t('sidebar.filterLearning');
                let mClass = 'mastery-learning';
                if (mastery.status === 'practicing') {
                    mLabel = t('sidebar.filterPracticing');
                    mClass = 'mastery-practicing';
                } else if (mastery.status === 'mastered') {
                    mLabel = t('sidebar.filterMastered');
                    mClass = 'mastery-mastered';
                }
                masteryBadgeHtml = `<span class="badge-mastery ${mClass}" title="${escapeHTML(t('sidebar.masteryBadgeTooltip', { status: mLabel, acc: mastery.bestAccuracy || 0 }))}">${mLabel}</span>`;
            }

            const isThisPreviewPlaying = currentPreviewSongId === song.id;
            const previewBtnHtml = `
                <button type="button" class="btn-sidebar-preview ${isThisPreviewPlaying ? 'playing' : ''}" data-id="${song.id}" title="${isThisPreviewPlaying ? escapeHTML(t('sidebar.stopPreviewTitle')) : escapeHTML(t('sidebar.previewTitle'))}">
                    <svg viewBox="0 0 24 24" class="icon-pv-play" width="12" height="12" fill="currentColor" style="display: ${isThisPreviewPlaying ? 'none' : 'block'};"><polygon points="6 4 18 12 6 20 6 4"></polygon></svg>
                    <svg viewBox="0 0 24 24" class="icon-pv-stop" width="12" height="12" fill="currentColor" style="display: ${isThisPreviewPlaying ? 'block' : 'none'};"><rect x="6" y="6" width="12" height="12"></rect></svg>
                </button>
            `;

            li.innerHTML = `
                <div class="song-item-info">
                    <div class="song-item-title-row">
                        <button type="button" class="btn-fav-star ${isFav ? 'active' : ''}" title="${isFav ? t('sidebar.removeFavTitle') : t('sidebar.addFavTitle')}">★</button>
                        <span class="song-item-title">${escapeHTML(song.title)}</span>
                    </div>
                    <span class="song-item-meta">${escapeHTML(song.artist || t('editor.traditional'))}${authorMeta} • ${song.key} • ${song.tempo} BPM</span>
                    <div class="song-badges">
                        <span class="badge-tag ${catClass}">${catLabel}</span>
                        ${visBadgeHtml}
                        ${isRemixTune ? `<span class="badge-tag" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4);" title="${escapeHTML(t('sidebar.variationOf', { parent: song.parent_author || 'Original' }))}">🔀 Remix</span>` : ''}
                        ${isLocalOnly ? `<span class="badge-offline-sync" title="${t('sidebar.localOnlyTitle')}">${t('sidebar.badgeLocal')}</span>` : ''}
                        <span class="badge-key">${t('sidebar.keyPrefix', { key: song.key || 'D' })}</span>
                        ${rangeBadgeHtml}
                        ${halfHoleBadgeHtml}
                        ${measuresBadgeHtml}
                        ${masteryBadgeHtml}
                        ${song.difficulty ? `<span class="badge-diff" title="${t('sidebar.difficulty')} ${song.difficulty}">${diffLabel}</span>` : ''}
                        ${rhythmLabel ? `<span class="badge-rhythm">${rhythmLabel}</span>` : ''}
                        ${song.remix_count ? `<span class="badge-diff" title="${song.remix_count} variações">🔀 ${song.remix_count}</span>` : ''}
                    </div>
                </div>
                <div class="song-item-actions" style="opacity: 1; display: flex; align-items: center; gap: 6px;">
                    ${previewBtnHtml}
                    ${actionsHtml}
                </div>
            `;

            fragment.appendChild(li);
        });

        songListEl.appendChild(fragment);
    }

    return {
        getIsSetModeActive: () => isSetModeActive,
        getCurrentPreviewSongId: () => currentPreviewSongId,
        stopSongPreview,
        startSongPreview,
        handleRandomTunePick,
        initSetModeControls,
        advanceToNextSetTune,
        updateActiveFiltersBadge,
        toggleSidebarFilters,
        setupSidebarFiltersAndCollapse,
        setupSidebarListDelegation,
        resetSidebarFilters,
        toggleSidebarCollapse,
        setSidebarCollapse,
        renderSidebar
    };
}
