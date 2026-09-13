const { useState, useEffect, useCallback } = React;
const h = React.createElement;

const API = ''; // rutas relativas — este archivo vive en el mismo dominio que /api

function useAdminFetch(token) {
  return useCallback(
    async (path, options = {}) => {
      const res = await fetch(API + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
          ...(options.headers || {})
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error de solicitud (' + res.status + ')');
      return data;
    },
    [token]
  );
}

function Badge({ value }) {
  return h('span', { className: 'adm-badge ' + value }, value);
}

function money(cents, currency) {
  return (cents / 100).toLocaleString('es-CO', { style: 'currency', currency: currency || 'USD' });
}

function LockScreen({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: 'Bearer ' + value }
      });
      if (!res.ok) throw new Error('Token incorrecto.');
      sessionStorage.setItem('ks_admin_token', value);
      onUnlock(value);
    } catch (err) {
      setError(err.message || 'Token incorrecto.');
    }
    setLoading(false);
  };

  return h(
    'div',
    { className: 'adm-lock' },
    h('h2', null, 'Panel de administración'),
    h('p', { style: { color: 'var(--text-dim)', fontSize: '13px' } }, 'Ingresa el token de administrador.'),
    h(
      'form',
      { onSubmit: submit },
      h('input', {
        type: 'password',
        placeholder: 'Admin token',
        value,
        onChange: e => setValue(e.target.value),
        autoFocus: true
      }),
      h(
        'button',
        { type: 'submit', className: 'btn btn-primary btn-full', disabled: loading },
        loading ? 'Verificando…' : 'Entrar'
      ),
      error && h('div', { className: 'adm-error' }, error)
    )
  );
}

function UsersTab({ apiFetch }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/users')
      .then(d => setUsers(d.users))
      .catch(e => setError(e.message));
  }, [apiFetch]);

  if (error) return h('div', { className: 'adm-error' }, error);
  if (!users) return h('div', { className: 'adm-empty' }, 'Cargando…');
  if (!users.length) return h('div', { className: 'adm-empty' }, 'Todavía no hay usuarios registrados.');

  return h(
    'table',
    { className: 'adm-table' },
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', null, 'ID'),
        h('th', null, 'Nombre'),
        h('th', null, 'Correo'),
        h('th', null, 'Verificado'),
        h('th', null, 'Creado'),
        h('th', null, 'Último login')
      )
    ),
    h(
      'tbody',
      null,
      users.map(u =>
        h(
          'tr',
          { key: u.id },
          h('td', null, u.id),
          h('td', null, u.name),
          h('td', null, u.email),
          h('td', null, u.email_verified ? h(Badge, { value: 'pagada' }) : h(Badge, { value: 'pendiente' })),
          h('td', null, (u.created_at || '').slice(0, 16)),
          h('td', null, (u.last_login_at || '—').slice(0, 16))
        )
      )
    )
  );
}

function QuotesTab({ apiFetch }) {
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    apiFetch('/api/admin/quotes')
      .then(d => setQuotes(d.quotes))
      .catch(e => setError(e.message));
  }, [apiFetch]);

  useEffect(load, [load]);

  const updateStatus = async (id, status) => {
    try {
      await apiFetch('/api/admin/quotes', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  if (error) return h('div', { className: 'adm-error' }, error);
  if (!quotes) return h('div', { className: 'adm-empty' }, 'Cargando…');
  if (!quotes.length) return h('div', { className: 'adm-empty' }, 'Todavía no hay cotizaciones.');

  const options = ['pendiente', 'cotizado', 'aprobado', 'rechazado'];

  return h(
    'table',
    { className: 'adm-table' },
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', null, 'ID'),
        h('th', null, 'Nombre'),
        h('th', null, 'Correo'),
        h('th', null, 'Plan'),
        h('th', null, 'Ubicación'),
        h('th', null, 'Estado'),
        h('th', null, 'Fecha')
      )
    ),
    h(
      'tbody',
      null,
      quotes.map(q =>
        h(
          'tr',
          { key: q.id },
          h('td', null, q.id),
          h('td', null, q.name || '—'),
          h('td', null, q.email || '—'),
          h('td', null, q.plan || q.solicitado || '—'),
          h('td', null, q.location || '—'),
          h(
            'td',
            null,
            h(
              'select',
              {
                className: 'adm-select',
                value: q.status || 'pendiente',
                onChange: e => updateStatus(q.id, e.target.value)
              },
              options.map(o => h('option', { key: o, value: o }, o))
            )
          ),
          h('td', null, (q.created_at || '').slice(0, 16))
        )
      )
    )
  );
}

function ServicesTab({ apiFetch }) {
  const [services, setServices] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ user_id: '', plan_name: '', location: '', ip_address: '' });

  const load = useCallback(() => {
    apiFetch('/api/admin/services')
      .then(d => setServices(d.services))
      .catch(e => setError(e.message));
  }, [apiFetch]);

  useEffect(load, [load]);

  const addService = async e => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/services', { method: 'POST', body: JSON.stringify(form) });
      setForm({ user_id: '', plan_name: '', location: '', ip_address: '' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await apiFetch('/api/admin/services', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const options = ['activo', 'suspendido', 'cancelado'];

  return h(
    React.Fragment,
    null,
    h(
      'form',
      { className: 'adm-form', onSubmit: addService },
      h('input', {
        placeholder: 'ID de usuario',
        value: form.user_id,
        onChange: e => setForm({ ...form, user_id: e.target.value }),
        required: true
      }),
      h('input', {
        placeholder: 'Nombre del plan',
        value: form.plan_name,
        onChange: e => setForm({ ...form, plan_name: e.target.value }),
        required: true
      }),
      h('input', {
        placeholder: 'Ubicación',
        value: form.location,
        onChange: e => setForm({ ...form, location: e.target.value })
      }),
      h('input', {
        placeholder: 'IP asignada',
        value: form.ip_address,
        onChange: e => setForm({ ...form, ip_address: e.target.value })
      }),
      h('button', { type: 'submit', className: 'btn btn-primary' }, 'Asignar servicio')
    ),
    error && h('div', { className: 'adm-error' }, error),
    !services && !error && h('div', { className: 'adm-empty' }, 'Cargando…'),
    services &&
      !services.length &&
      h('div', { className: 'adm-empty' }, 'Todavía no hay servicios asignados.'),
    services &&
      !!services.length &&
      h(
        'table',
        { className: 'adm-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'ID'),
            h('th', null, 'Cliente'),
            h('th', null, 'Plan'),
            h('th', null, 'Ubicación'),
            h('th', null, 'IP'),
            h('th', null, 'Estado'),
            h('th', null, 'Desde')
          )
        ),
        h(
          'tbody',
          null,
          services.map(s =>
            h(
              'tr',
              { key: s.id },
              h('td', null, s.id),
              h('td', null, s.user_email),
              h('td', null, s.plan_name),
              h('td', null, s.location || '—'),
              h('td', null, s.ip_address || '—'),
              h(
                'td',
                null,
                h(
                  'select',
                  {
                    className: 'adm-select',
                    value: s.status || 'activo',
                    onChange: e => updateStatus(s.id, e.target.value)
                  },
                  options.map(o => h('option', { key: o, value: o }, o))
                )
              ),
              h('td', null, (s.created_at || '').slice(0, 16))
            )
          )
        )
      )
  );
}

function InvoicesTab({ apiFetch }) {
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ user_id: '', amount: '', description: '', due_date: '' });

  const load = useCallback(() => {
    apiFetch('/api/admin/invoices')
      .then(d => setInvoices(d.invoices))
      .catch(e => setError(e.message));
  }, [apiFetch]);

  useEffect(load, [load]);

  const addInvoice = async e => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/invoices', { method: 'POST', body: JSON.stringify(form) });
      setForm({ user_id: '', amount: '', description: '', due_date: '' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await apiFetch('/api/admin/invoices', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const options = ['pendiente', 'pagada', 'cancelada'];

  return h(
    React.Fragment,
    null,
    h(
      'form',
      { className: 'adm-form', onSubmit: addInvoice },
      h('input', {
        placeholder: 'ID de usuario',
        value: form.user_id,
        onChange: e => setForm({ ...form, user_id: e.target.value }),
        required: true
      }),
      h('input', {
        placeholder: 'Monto (USD)',
        type: 'number',
        step: '0.01',
        value: form.amount,
        onChange: e => setForm({ ...form, amount: e.target.value }),
        required: true
      }),
      h('input', {
        placeholder: 'Descripción (ej. VPS Plan 4 - Septiembre)',
        value: form.description,
        onChange: e => setForm({ ...form, description: e.target.value }),
        required: true
      }),
      h('input', {
        placeholder: 'Vence (YYYY-MM-DD)',
        value: form.due_date,
        onChange: e => setForm({ ...form, due_date: e.target.value })
      }),
      h('button', { type: 'submit', className: 'btn btn-primary' }, 'Crear factura')
    ),
    error && h('div', { className: 'adm-error' }, error),
    !invoices && !error && h('div', { className: 'adm-empty' }, 'Cargando…'),
    invoices && !invoices.length && h('div', { className: 'adm-empty' }, 'Todavía no hay facturas.'),
    invoices &&
      !!invoices.length &&
      h(
        'table',
        { className: 'adm-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'ID'),
            h('th', null, 'Cliente'),
            h('th', null, 'Descripción'),
            h('th', null, 'Monto'),
            h('th', null, 'Estado'),
            h('th', null, 'Vence'),
            h('th', null, 'Creada')
          )
        ),
        h(
          'tbody',
          null,
          invoices.map(inv =>
            h(
              'tr',
              { key: inv.id },
              h('td', null, inv.id),
              h('td', null, inv.user_email),
              h('td', null, inv.description),
              h('td', null, money(inv.amount_cents, inv.currency)),
              h(
                'td',
                null,
                h(
                  'select',
                  {
                    className: 'adm-select',
                    value: inv.status,
                    onChange: e => updateStatus(inv.id, e.target.value)
                  },
                  options.map(o => h('option', { key: o, value: o }, o))
                )
              ),
              h('td', null, inv.due_date || '—'),
              h('td', null, (inv.created_at || '').slice(0, 16))
            )
          )
        )
      )
  );
}

function Dashboard({ token, onLogout }) {
  const apiFetch = useAdminFetch(token);
  const [tab, setTab] = useState('usuarios');

  const tabs = [
    { key: 'usuarios', label: 'Usuarios', Comp: UsersTab },
    { key: 'cotizaciones', label: 'Cotizaciones', Comp: QuotesTab },
    { key: 'servicios', label: 'Servicios', Comp: ServicesTab },
    { key: 'facturas', label: 'Facturas', Comp: InvoicesTab }
  ];
  const Active = tabs.find(t => t.key === tab).Comp;

  return h(
    React.Fragment,
    null,
    h(
      'div',
      { className: 'adm-head' },
      h(
        'div',
        { className: 'adm-logo' },
        h(
          'svg',
          { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#3d7fff', strokeWidth: 1.6 },
          h('path', { d: 'M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4Z' })
        ),
        'Kernel',
        h('span', null, 'Shield'),
        ' · Admin'
      ),
      h(
        'button',
        {
          className: 'btn btn-ghost',
          onClick: () => {
            sessionStorage.removeItem('ks_admin_token');
            onLogout();
          }
        },
        'Salir'
      )
    ),
    h(
      'div',
      { className: 'adm-tabs' },
      tabs.map(t =>
        h(
          'button',
          {
            key: t.key,
            className: 'adm-tab' + (tab === t.key ? ' active' : ''),
            onClick: () => setTab(t.key)
          },
          t.label
        )
      )
    ),
    h('div', { className: 'adm-card' }, h(Active, { apiFetch }))
  );
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('ks_admin_token') || '');

  if (!token) return h(LockScreen, { onUnlock: setToken });
  return h(Dashboard, { token, onLogout: () => setToken('') });
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
