import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  ListFilter,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  getGetTaskSummaryQueryKey,
  getListTasksQueryKey,
  type Task,
  useCreateTask,
  useDeleteTask,
  useGetTaskSummary,
  useListTasks,
  useUpdateTask,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Filter = 'all' | 'active' | 'completed';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ink' | 'gold' | 'sage';
}) {
  const toneClass = tone === 'gold' ? 'text-[#c5812f]' : tone === 'sage' ? 'text-[#78974b]' : 'text-foreground';
  return (
    <div className="min-w-[84px]">
      <div className={`font-display text-3xl leading-none ${toneClass}`} data-testid={`metric-${label.toLowerCase()}`}>
        {value}
      </div>
      <div className="mt-2 text-[10px] font-mono-ui uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="skeleton-sheen mt-1 h-6 w-6 rounded-full" />
      <div className="flex-1 space-y-3">
        <div className="skeleton-sheen h-4 w-2/3 rounded" />
        <div className="skeleton-sheen h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

function CreateTaskForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focused, setFocused] = useState(false);
  const createTask = useCreateTask();
  const queryClient = useQueryClient();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || createTask.isPending) return;
    createTask.mutate(
      { data: { title: title.trim(), description: description.trim() || undefined } },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setFocused(false);
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
          onCreated();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className={`relative overflow-hidden rounded-[1.35rem] border bg-card p-5 shadow-[0_16px_42px_hsl(164_24%_19%_/_0.06)] transition-all duration-300 sm:p-6 ${focused ? 'border-primary/45 ring-4 ring-primary/5' : 'border-card-border'}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/25 text-[#9b6928]">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Put something in motion</p>
            <p className="text-xs text-muted-foreground">A small next step is enough.</p>
          </div>
        </div>
        <span className="hidden text-[10px] font-mono-ui uppercase tracking-[0.16em] text-muted-foreground sm:block">New intention</span>
      </div>
      <input
        data-testid="input-task-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="What would make today feel lighter?"
        className="w-full bg-transparent font-display text-2xl leading-tight text-foreground outline-none placeholder:text-muted-foreground/55 sm:text-[1.7rem]"
        maxLength={160}
      />
      <div className={`mt-4 flex flex-col gap-3 transition-all duration-300 sm:flex-row sm:items-end ${focused || description ? 'opacity-100' : 'opacity-70'}`}>
        <textarea
          data-testid="input-task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Add a little context (optional)"
          rows={2}
          className="min-h-[58px] flex-1 resize-none rounded-xl border border-input bg-muted/35 px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-primary/45 focus:bg-card"
          maxLength={300}
        />
        <button
          data-testid="button-create-task"
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="inline-flex h-[58px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {createTask.isPending ? 'Adding…' : 'Add task'}
          {!createTask.isPending && <Plus size={16} />}
        </button>
      </div>
      {createTask.isError && <p className="mt-3 text-xs text-destructive" data-testid="status-create-error">Couldn’t add that task. Try again.</p>}
    </form>
  );
}

function TaskRow({
  task,
  onRefresh,
  onDelete,
}: {
  task: Task;
  onRefresh: () => void;
  onDelete: (task: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();

  const update = (data: { title?: string; description?: string; completed?: boolean }) => {
    updateTask.mutate(
      { id: task.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
          onRefresh();
        },
      },
    );
  };

  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || updateTask.isPending) return;
    update({ title: title.trim(), description: description.trim() });
    setEditing(false);
  };

  return (
    <article
      className={`group relative rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_hsl(164_24%_19%_/_0.07)] ${task.completed ? 'border-[#b6c99d]/50 bg-[#f8f9f1]' : 'border-card-border'}`}
      data-testid={`card-task-${task.id}`}
    >
      <div className="flex gap-4">
        <button
          type="button"
          data-testid={`button-toggle-task-${task.id}`}
          aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
          onClick={() => update({ completed: !task.completed })}
          disabled={updateTask.isPending}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${task.completed ? 'animate-check border-[#78974b] bg-[#78974b] text-white' : 'border-[#b2bcae] text-transparent hover:border-[#78974b] hover:bg-[#e9f0df]'}`}
        >
          <Check size={14} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-3">
              <input
                data-testid={`input-edit-title-${task.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoFocus
                className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
              />
              <textarea
                data-testid={`input-edit-description-${task.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button data-testid={`button-save-task-${task.id}`} type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save changes</button>
                <button data-testid={`button-cancel-edit-${task.id}`} type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <h3 className={`pr-20 text-[15px] font-semibold leading-6 transition-colors ${task.completed ? 'text-muted-foreground line-through decoration-[#78974b]/60' : 'text-foreground'}`} data-testid={`text-task-title-${task.id}`}>{task.title}</h3>
              {task.description && <p className={`mt-1.5 max-w-2xl text-sm leading-5 ${task.completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`} data-testid={`text-task-description-${task.id}`}>{task.description}</p>}
              <div className="mt-3 flex items-center gap-2 text-[10px] font-mono-ui uppercase tracking-[0.12em] text-muted-foreground/75">
                <span>{task.completed ? 'Completed' : 'Added'} {formatDate(task.updatedAt || task.createdAt)}</span>
                {task.completed && <span className="h-1 w-1 rounded-full bg-[#78974b]" />}
                {task.completed && <span className="text-[#78974b]">Nice work</span>}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div className="absolute right-4 top-4 flex translate-x-1 items-center gap-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 focus-within:translate-x-0 focus-within:opacity-100">
            <button data-testid={`button-edit-task-${task.id}`} type="button" aria-label={`Edit ${task.title}`} onClick={() => setEditing(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={15} /></button>
            <button data-testid={`button-delete-task-${task.id}`} type="button" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task)} className="rounded-lg p-2 text-muted-foreground hover:bg-[#faece9] hover:text-destructive"><Trash2 size={15} /></button>
          </div>
        )}
      </div>
    </article>
  );
}

function DeleteDialog({ task, onClose, onDeleted }: { task: Task; onClose: () => void; onDeleted: () => void }) {
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const confirm = () => {
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
        onDeleted();
      },
    });
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[hsl(164_24%_19%_/_0.34)] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="dialog-delete-task">
      <div className="w-full max-w-md animate-rise rounded-[1.35rem] border border-card-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#faece9] text-destructive"><Trash2 size={19} /></div>
          <button data-testid="button-close-delete-dialog" type="button" aria-label="Close dialog" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-destructive">Remove task</p>
        <h2 className="mt-2 font-display text-2xl text-foreground">Let this one go?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">“{task.title}” will disappear from your list. This can’t be undone.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button data-testid="button-cancel-delete" type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Keep it</button>
          <button data-testid="button-confirm-delete" type="button" onClick={confirm} disabled={deleteTask.isPending} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-50">{deleteTask.isPending ? 'Removing…' : 'Remove task'}</button>
        </div>
        {deleteTask.isError && <p className="mt-3 text-right text-xs text-destructive" data-testid="status-delete-error">Couldn’t remove that task. Try again.</p>}
      </div>
    </div>
  );
}

function Home() {
  const [filter, setFilter] = useState<Filter>('all');
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [notice, setNotice] = useState('');
  const { data: tasks, isLoading, isError, refetch } = useListTasks(undefined, { query: { queryKey: getListTasksQueryKey() } });
  const { data: summary, isLoading: summaryLoading } = useGetTaskSummary({ query: { queryKey: getGetTaskSummaryQueryKey() } });

  const visibleTasks = useMemo(() => {
    const list = tasks ?? [];
    if (filter === 'active') return list.filter((task) => !task.completed);
    if (filter === 'completed') return list.filter((task) => task.completed);
    return list;
  }, [filter, tasks]);

  const stats = summary ?? { total: tasks?.length ?? 0, active: tasks?.filter((task) => !task.completed).length ?? 0, completed: tasks?.filter((task) => task.completed).length ?? 0 };
  const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };

  return (
    <main className="min-h-[100dvh] bg-background">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="relative overflow-hidden bg-sidebar px-6 pb-7 pt-7 text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:w-[280px] lg:shrink-0 lg:flex-col lg:px-8 lg:py-9">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-sidebar-border/50" />
          <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-sidebar-border/40" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_20px_hsl(35_86%_67%_/_0.2)]"><ClipboardCheck size={20} /></div>
            <div>
              <div className="font-display text-xl leading-none">Steady</div>
              <div className="mt-1 text-[10px] font-mono-ui uppercase tracking-[0.2em] text-sidebar-foreground/55">Task tracker</div>
            </div>
          </div>
          <div className="relative mt-12 hidden lg:block">
            <p className="text-[10px] font-mono-ui uppercase tracking-[0.18em] text-sidebar-foreground/45">A quiet place to</p>
            <p className="mt-3 max-w-[180px] font-display text-[2.15rem] leading-[1.05] text-sidebar-foreground">make progress visible.</p>
          </div>
          <div className="relative mt-8 hidden lg:mt-auto lg:block">
            <div className="mb-3 flex items-center justify-between text-[10px] font-mono-ui uppercase tracking-[0.16em] text-sidebar-foreground/55">
              <span>Today’s rhythm</span>
              <span data-testid="text-progress-percent">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sidebar-accent">
              <div className="h-full rounded-full bg-sidebar-primary transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-4 text-xs leading-5 text-sidebar-foreground/50">Small steps count. Especially the ones nobody else sees.</p>
          </div>
        </aside>

        <section className="flex-1 px-5 py-7 sm:px-8 lg:px-14 lg:py-12">
          <div className="mx-auto max-w-[920px]">
            <header className="mb-8 flex items-start justify-between gap-5 sm:mb-10">
              <div>
                <div className="mb-3 flex items-center gap-2 text-[10px] font-mono-ui uppercase tracking-[0.18em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[#78974b]" /> Your space</div>
                <h1 className="font-display text-[2.7rem] leading-[.98] tracking-[-0.035em] text-foreground sm:text-5xl">A little further<br /><span className="text-primary">than yesterday.</span></h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Keep the list small, the next step clear, and let the evidence of your effort build.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-mono-ui uppercase tracking-[0.13em] text-muted-foreground sm:flex"><Sparkles size={13} className="text-[#c5812f]" /> Keep going</div>
            </header>

            <CreateTaskForm onCreated={() => showNotice('Task added to your path')} />

            <section className="mt-9 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card/65 p-4 sm:gap-7 sm:p-5" aria-label="Task summary">
              <Metric label="Total" value={summaryLoading ? 0 : stats.total} tone="ink" />
              <Metric label="In progress" value={summaryLoading ? 0 : stats.active} tone="gold" />
              <Metric label="Completed" value={summaryLoading ? 0 : stats.completed} tone="sage" />
            </section>

            <div className="mb-5 mt-10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-foreground">Your intentions</h2>
                <p className="mt-1 text-xs text-muted-foreground">{stats.active === 0 && stats.total > 0 ? 'Everything is accounted for.' : `${stats.active} ${stats.active === 1 ? 'step' : 'steps'} still in motion`}</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Filter tasks">
                <ListFilter size={14} className="ml-2 mr-1 text-muted-foreground" />
                {(['all', 'active', 'completed'] as Filter[]).map((item) => (
                  <button
                    key={item}
                    data-testid={`button-filter-${item}`}
                    type="button"
                    role="tab"
                    aria-selected={filter === item}
                    onClick={() => setFilter(item)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold capitalize transition ${filter === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {isError ? (
              <div className="rounded-2xl border border-[#efc8c2] bg-[#fff8f6] p-8 text-center" data-testid="state-task-error">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#faece9] text-destructive"><RotateCcw size={18} /></div>
                <h3 className="mt-4 font-display text-xl text-foreground">The list took a pause.</h3>
                <p className="mt-2 text-sm text-muted-foreground">We couldn’t bring in your tasks right now.</p>
                <button data-testid="button-retry-tasks" type="button" onClick={() => refetch()} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Try again</button>
              </div>
            ) : isLoading ? (
              <div className="space-y-3" data-testid="state-task-loading"><TaskSkeleton /><TaskSkeleton /><TaskSkeleton /></div>
            ) : visibleTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c8d2bd] bg-[#f7f9f1] px-6 py-12 text-center" data-testid="state-task-empty">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6eed9] text-[#78974b]"><CheckCircle2 size={26} /></div>
                <h3 className="mt-5 font-display text-2xl text-foreground">{filter === 'completed' ? 'No finished steps yet.' : filter === 'active' ? 'A clear runway.' : 'Start with one small thing.'}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{filter === 'active' ? 'You’ve closed every open loop. Enjoy the quiet, or add the next one above.' : filter === 'completed' ? 'The first check-off is waiting for you.' : 'Give your attention somewhere kind and concrete.'}</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="list-tasks">
                {visibleTasks.map((task, index) => (
                  <div key={task.id} className="animate-rise" style={{ animationDelay: `${Math.min(index * 45, 260)}ms` }}>
                    <TaskRow task={task} onRefresh={() => {}} onDelete={setDeleting} />
                  </div>
                ))}
              </div>
            )}
            <p className="mt-8 flex items-center justify-center gap-2 text-center text-[10px] font-mono-ui uppercase tracking-[0.15em] text-muted-foreground/60"><span className="h-1 w-1 rounded-full bg-[#c5812f]" /> Progress, not perfection</p>
          </div>
        </section>
      </div>
      {notice && <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg animate-rise" role="status" data-testid="status-notice">{notice}</div>}
      {deleting && <DeleteDialog task={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); showNotice('Task removed'); }} />}
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={() => <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6"><div className="text-center"><p className="font-mono-ui text-xs uppercase tracking-[0.18em] text-muted-foreground">404</p><h1 className="mt-3 font-display text-4xl">This page wandered off.</h1></div></div>} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
