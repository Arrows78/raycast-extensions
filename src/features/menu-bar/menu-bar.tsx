import { useFilter } from '@/services/notion/hooks/use-filter'
import { useLocalPreferences } from '@/services/notion/hooks/use-local-preferences'
import { useTodos } from '@/services/notion/hooks/use-todos'
import { completeTodo } from '@/services/notion/operations/complete-todo'
import { Todo } from '@/types/todo'
import { Color, MenuBarExtra } from '@raycast/api'
import { getProgressIcon } from '@raycast/utils'
import { truncate } from './truncate'

export function MenuBar() {
  const { preferences } = useLocalPreferences()
  const { filterTodo } = useFilter()
  const { todos, error, isLoading, mutate } = useTodos({
    databaseId: preferences.databaseId,
    filter: filterTodo,
  })

  const handleComplete = async (todo: Todo) => {
    await mutate(completeTodo(todo.id), {
      optimisticUpdate(data) {
        if (!data) return data
        return data.filter((t) => t.id !== todo.id)
      },
      shouldRevalidateAfter: true,
    })
  }

  const groupedTodos = todos?.reduce((acc, todo) => {
    const status = todo.status?.name || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={`${todos?.length || 0}`}
      icon={{
        source: {
          dark: 'light-hypersonic.png',
          light: 'dark-hypersonic.png',
        },
      }}
    >
      {error ? <MenuBarExtra.Item title={error.message} /> : null}

      {!isLoading && !error && todos && todos.length === 0 ? (
        <MenuBarExtra.Item title="No Todos" />
      ) : null}

      {!error && groupedTodos && 
        Object.keys(groupedTodos).map((status) => (
          <MenuBarExtra.Section key={status} title={status}>
            {groupedTodos[status]?.map((todo) => {
              const { truncatedStr, isTruncated } = truncate(todo.title);
              return (
                <MenuBarExtra.Item
                  onAction={() => handleComplete(todo)}
                  key={todo.id}
                  icon={{
                    source: getProgressIcon(todo.inProgress ? 0.5 : 0),
                    tintColor: todo.inProgress ? Color.Yellow : Color.SecondaryText,
                  }}
                  title={todo.status?.name + " " + truncatedStr}
                  tooltip={isTruncated ? todo.title : undefined}
                />
              );
            })}
          </MenuBarExtra.Section>
        ))
      }
    </MenuBarExtra>
  )
}
