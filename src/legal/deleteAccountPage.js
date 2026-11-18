document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('public-delete-account-form');
    const statusEl = document.getElementById('public-delete-status');
    const submitBtn = document.getElementById('btn-submit-public-delete');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('del-username')?.value.trim() || '';
        const credential = document.getElementById('del-password')?.value || '';
        const keepTunes = form.querySelector('input[name="keepTunes"]:checked')?.value === 'true';

        if (!username || !credential) return;

        if (statusEl) {
            statusEl.className = 'status-msg';
            statusEl.textContent = '';
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processando exclusão...';
        }

        try {
            const res = await fetch('/api/auth/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    username,
                    password: credential,
                    recoveryPhrase: credential,
                    keepTunes
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Não foi possível excluir a conta.');
            }
            if (statusEl) {
                statusEl.className = 'status-msg success';
                statusEl.textContent = data.message || 'Conta excluída com sucesso.';
            }
            form.reset();
        } catch (err) {
            if (statusEl) {
                statusEl.className = 'status-msg error';
                statusEl.textContent = err.message || 'Erro ao excluir conta.';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirmar Exclusão Permanente da Conta';
            }
        }
    });
});
