import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDistanceToNow, format } from 'date-fns';



type Item = {
    id: string;
    title: string;
    subtitle?: string;
    initiatedOn: string; // ISO date
    dueDate?: string; // optional due date
    category?: string;
    timeAgo?: string;
    body?: string;
    status?: string;
};

const sampleItems: Item[] = [
  {
    id: '1',
    title: 'Asset Preference',
    subtitle: 'Teja Rajendra Durga Vara Prasad Kocherla',
    initiatedOn: '2025-06-04',
    dueDate: '2025-06-15',
    category: 'Onboarding',
    body: 'Hello Teja Rajendra Durga Vara Prasad Kocherla,\nPlease share your asset preference.',
    status: 'Not started',
  },
  {
    id: '2',
    title: 'Payroll - US A',
    subtitle: 'Teja Rajendra',
    initiatedOn: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    category: 'Payroll',
    body: 'Payroll details',
    status: 'In progress',
  },
  {
    id: '2-1',
    title: 'Payroll - US B',
    subtitle: 'Teja Rajendra',
    initiatedOn: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    category: 'Payroll',
    body: 'Payroll details',
    status: 'In progress',
  },
  {
    id: '2-2',
    title: 'Payroll - US C',
    subtitle: 'Teja Rajendra',
    initiatedOn: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    category: 'Payroll',
    body: 'Payroll details',
    status: 'In progress',
  },
  {
    id: '2-3',
    title: 'Payroll - US D',
    subtitle: 'Teja Rajendra',
    initiatedOn: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    category: 'Payroll',
    body: 'Payroll details',
    status: 'In progress',
  },
  {
    id: '3',
    title: 'Address Proof - US',
    subtitle: 'Teja Rajendra',
    initiatedOn: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    category: 'Compliance',
    body: 'Please upload address proof',
    status: 'Not started',
  },
  {
    id: '4',
    title: 'Previous Experience',
    subtitle: 'Teja Rajendra',
    initiatedOn: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    category: 'Onboarding',
    body: 'Share your previous experience details',
    status: 'Not started',
  },
  {
    id: '5',
    title: 'Proof of ID',
    subtitle: 'Teja Rajendra',
    initiatedOn: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    category: 'Compliance',
    body: 'Upload ID proof',
    status: 'Completed',
  },
];

const InboxPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>(sampleItems);
  const [selected, setSelected] = useState<Item | null>(items[0] || null);
  const [selectedListItem, setSelectedListItem] = useState<{ id: string; list: 'take' | 'new' | 'upcoming' | 'archive' } | null>(items[0] ? { id: items[0].id, list: 'take' } : null);
  const [filter, setFilter] = useState<string>('');
  const [tab, setTab] = useState<'take' | 'notifications' | 'archive'>('take');
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState<string[]>([]);

    // Derived sets
    const pendingItems = useMemo(() => items.filter((it) => it.status === 'Not started' || it.status === 'In progress'), [items]);
    const archiveItems = useMemo(() => items.filter((it) => it.status === 'Completed'), [items]);
    const newTasks = useMemo(() => items.filter((it) => (Date.now() - new Date(it.initiatedOn).getTime()) <= 7 * 24 * 3600 * 1000), [items]);
    const upcomingTasks = useMemo(() => items.filter((it) => it.dueDate && new Date(it.dueDate) > new Date()), [items]);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const base = (list: Item[]) => (q ? list.filter((it) => (it.title + ' ' + (it.subtitle || '') + ' ' + (it.category || '')).toLowerCase().includes(q)) : list);

        if (tab === 'take') return base(pendingItems);
        if (tab === 'notifications') {
            // merge new + upcoming, keep uniqueness
            const merged = [...newTasks, ...upcomingTasks];
            const uniq = merged.filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
            return base(uniq);
        }
        return base(archiveItems);
    }, [items, filter, tab, pendingItems, archiveItems, newTasks, upcomingTasks]);

    const pendingCount = pendingItems.length;
    const notificationsCount = newTasks.length + upcomingTasks.length;
    const archiveCount = archiveItems.length;

    const categories = useMemo(() => {
        const map = new Map<string, number>();
        items.forEach((it) => {
            const key = it.category || 'Other';
            map.set(key, (map.get(key) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    }, [items]);

  const handleArchive = (id: string) => {
    const item = items.find((it) => it.id === id);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'Completed' } : it)));
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status: 'Completed' } : prev));
    if (item) setActivity((a) => [...a, `Archived "${item.title}"`]);
  };

  const handleUnarchive = (id: string) => {
    const item = items.find((it) => it.id === id);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'Not started' } : it)));
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status: 'Not started' } : prev));
    if (item) setActivity((a) => [...a, `Restored "${item.title}"`]);
  };

  const handleDelete = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (!confirm('Are you sure you want to delete this item?')) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (selected?.id === id) setSelected(null);
    if (item) setActivity((a) => [...a, `Deleted "${item.title}"`]);
  };

  return (
    <DashboardLayout title="Inbox" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inbox' }]}>
      <div className="space-y-4">
        <div className="bg-white/5 p-3 rounded-md shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab('take')}
              className={`px-3 py-2 rounded-t-md text-sm ${tab === 'take' ? 'border-b-2 border-primary-gradient text-primary' : 'text-muted'}`}
            >
              TAKE ACTION ({pendingCount})
            </button>
            <button
              onClick={() => setTab('notifications')}
              className={`px-3 py-2 rounded-t-md text-sm ${tab === 'notifications' ? 'border-b-2 border-primary-gradient text-primary' : 'text-muted'}`}
            >
              NOTIFICATIONS ({notificationsCount})
            </button>
            <button
              onClick={() => setTab('archive')}
              className={`px-3 py-2 rounded-t-md text-sm ${tab === 'archive' ? 'border-b-2 border-primary-gradient text-primary' : 'text-muted'}`}
            >
              ARCHIVE ({archiveCount})
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <div className="hidden sm:block">Newest</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-start h-full">
          {/* Left categories - sticky */}
          <aside className="col-span-2">
            <Card className="p-0 sticky top-6 h-full overflow-auto bg-white/5 border border-light-border rounded-md shadow-sm">
              <div className="p-3 border-b">
                <p className="text-sm font-semibold">CATEGORIES</p>
              </div>
              <div className="p-2 space-y-2">
                {categories.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setFilter(c.name)}
                    className={`w-full text-left px-3 py-2 rounded flex items-center justify-between hover:bg-white/10 transition border border-transparent ${filter === c.name ? 'bg-primary-10 border border-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-10 flex items-center justify-center text-primary text-xs font-semibold">{c.name.charAt(0)}</div>
                      <span className="text-sm">{c.name}</span>
                    </div>
                    <span className="text-sm text-muted">({c.count})</span>
                  </button>
                ))}

                <button
                  onClick={() => setFilter('')}
                  className="w-full text-left px-3 py-2 rounded mt-2 text-sm text-muted hover:bg-white/10 transition"
                >
                  Show all
                </button>
              </div>
            </Card>
          </aside>

          {/* Middle list */}
          <div className="col-span-4">
            <Card className="flex flex-col h-[500px]">
              <div className="p-3 border-b border-light-border bg-white/5 sticky top-0 z-10">
                <Input
                  placeholder="Search by employee name, task name"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>

              <div className="flex-1 divide-y p-2 overflow-auto">
                {/* TAKE ACTION - compact list */}
                {tab === 'take' && (filtered.length === 0 ? (
                  <div className="p-6 text-center text-muted">No pending tasks</div>
                ) : (
                  filtered.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => { setSelected(it); setSelectedListItem({ id: it.id, list: 'take' }); }}
                      className={`flex items-start gap-3 px-3 py-2 hover:bg-white/10 hover:shadow-sm rounded-md cursor-pointer transition ${selectedListItem?.id === it.id && selectedListItem?.list === 'take' ? 'bg-white/10 border border-light-border' : 'border border-transparent'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">{it.title.split(' ').map((s) => s[0]).slice(0,2).join('')}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{it.title}</p>
                          <div className="text-xs text-muted text-right">
                            <div>{it.dueDate ? format(new Date(it.dueDate), 'dd MMM') : ''}</div>
                          </div>
                        </div>

                        <p className="text-xs text-muted truncate">{it.subtitle} · {it.category}</p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${it.status === 'Not started' ? 'bg-yellow-100 text-yellow-700' : it.status === 'In progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{it.status}</span>
                          <span className="text-[11px] text-muted">{formatDistanceToNow(new Date(it.initiatedOn), { addSuffix: true })}</span>
                        </div>
                      </div>


                    </div>
                  ))
                ))}

                {/* NOTIFICATIONS - grouped */}
                {tab === 'notifications' && (
                  <div className="p-2 space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-2">New Tasks</p>
                      {newTasks.length === 0 ? (
                        <p className="text-sm text-muted">No new tasks</p>
                      ) : (
                        <div className="space-y-2">
                          {newTasks.map((it) => (
                            <div key={it.id} onClick={() => { setSelected(it); setSelectedListItem({ id: it.id, list: 'new' }); }} className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 hover:shadow-sm cursor-pointer transition ${selectedListItem?.id === it.id && selectedListItem?.list === 'new' ? 'bg-white/10 border border-light-border' : ''}`}>
                              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold">{it.title.split(' ').map(s => s[0]).slice(0,2).join('')}</div>
                              <div className="flex-1">
                                <p className="font-medium">{it.title}</p>
                                <p className="text-xs text-muted">{it.subtitle} · {it.category}</p>
                              </div>
                              <div className="text-xs text-muted">{formatDistanceToNow(new Date(it.initiatedOn), { addSuffix: true })}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-2">Upcoming Tasks</p>
                      {upcomingTasks.length === 0 ? (
                        <p className="text-sm text-muted">No upcoming tasks</p>
                      ) : (
                        <div className="space-y-2">
                          {upcomingTasks.map((it) => (
                            <div key={it.id} onClick={() => { setSelected(it); setSelectedListItem({ id: it.id, list: 'upcoming' }); }} className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 hover:shadow-sm cursor-pointer transition ${selectedListItem?.id === it.id && selectedListItem?.list === 'upcoming' ? 'bg-white/10 border border-light-border' : ''}`}>
                              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold">{it.title.split(' ').map(s => s[0]).slice(0,2).join('')}</div>
                              <div className="flex-1">
                                <p className="font-medium">{it.title}</p>
                                <p className="text-xs text-muted">Due {it.dueDate ? format(new Date(it.dueDate), 'dd MMM yyyy') : ''} · {it.category}</p>
                              </div>
                              <div className="text-xs text-muted">{it.dueDate ? formatDistanceToNow(new Date(it.dueDate), { addSuffix: true }) : ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ARCHIVE - compact */}
                {tab === 'archive' && (filtered.length === 0 ? (
                  <div className="p-6 text-center text-muted">No archived items</div>
                ) : (
                  filtered.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => { setSelected(it); setSelectedListItem({ id: it.id, list: 'archive' }); }}
                      className={`flex items-center gap-3 px-3 py-2 hover:bg-white/10 hover:shadow-sm cursor-pointer ${selectedListItem?.id === it.id && selectedListItem?.list === 'archive' ? 'bg-white/10 border border-light-border' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">{it.title.split(' ').map((s) => s[0]).slice(0,2).join('')}</div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{it.title}</p>
                        <p className="text-xs text-muted">{it.subtitle}</p>
                      </div>
                      <div className="text-xs text-muted">{formatDistanceToNow(new Date(it.initiatedOn), { addSuffix: true })}</div>

                      <div className="flex flex-col items-end gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleUnarchive(it.id); }}>Restore</Button>
                      </div>
                    </div>
                  ))
                ))}

                {filtered.length === 0 && tab === 'take' && (
                  <div className="p-6 text-center text-muted">No items found</div>
                )}
              </div>
            </Card>
          </div>

          {/* Right details */}
          <div className="col-span-6">
            <Card className="flex flex-col h-[500px]">
              {selected ? (
                <div className="flex-1 flex flex-col overflow-auto">
                  <div className="flex items-start justify-between p-4 border-b border-light-border bg-white/5">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{selected.title}</h3>
                      <p className="text-sm text-muted">Initiated on {format(new Date(selected.initiatedOn), 'dd MMM yyyy')}{selected.dueDate ? ` · Due ${format(new Date(selected.dueDate), 'dd MMM yyyy')}` : ''}</p>

                      {/* Action controls moved below the subtitle */}
                      <div className="mt-3 flex items-center gap-3">
                        <select
                          className="form-select"
                          value={selected.status}
                          onChange={(e) => setSelected({ ...selected, status: e.target.value })}
                        >
                          <option>Not started</option>
                          <option>In progress</option>
                          <option>Completed</option>
                        </select>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            if (!selected) return;
                            handleArchive(selected.id);
                          }}>
                            Mark Complete
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => selected && handleDelete(selected.id)}>
                            Delete
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => selected && (selected.status === 'Completed' ? handleUnarchive(selected.id) : handleArchive(selected.id))}>
                            {selected?.status === 'Completed' ? 'Unarchive' : 'Archive'}
                          </Button>

                          <Button size="sm" className="bg-primary text-white hover:bg-primary/90" onClick={() => {
                            // quick reply focus behavior
                            const el = document.getElementById('inbox-message-input') as HTMLInputElement | null;
                            if (el) el.focus();
                          }}>
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Right side intentionally left empty to keep layout balanced */}
                    <div />
                  </div>

                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    <div className="text-sm text-muted">
                      <p>{selected.body}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-3">Activity</h4>
                      {activity.length === 0 ? (
                        <p className="text-sm text-muted">No activity logged here</p>
                      ) : (
                        <div className="space-y-2">
                          {activity.map((a, i) => (
                            <div key={i} className="text-sm bg-white/5 p-2 rounded">{a}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 border-t border-light-border bg-white/5">
                    <div className="flex items-center gap-2">
                      <Input id="inbox-message-input" className="w-full" placeholder="Type your message here" value={message} onChange={(e) => setMessage(e.target.value)} />
                      <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => {
                        if (!message) return;
                        setActivity((a) => [...a, message]);
                        setMessage('');
                      }}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-muted">Select an item to view details</div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InboxPage;