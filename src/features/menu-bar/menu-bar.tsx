import { useMemo } from 'react'
import { useFilter } from '@/services/notion/hooks/use-filter'
import { useLocalPreferences } from '@/services/notion/hooks/use-local-preferences'
import { useTodos } from '@/services/notion/hooks/use-todos'
import { completeTodo } from '@/services/notion/operations/complete-todo'
import { Todo } from '@/types/todo'
import { useTodoList } from '@/features/todo-list/hooks/use-todo-list'
import { Color, MenuBarExtra, getPreferenceValues } from '@raycast/api'
import { getStatusGroup } from '@/utils/statuses'
import { getProgressIcon } from '@raycast/utils'
import { truncate } from './truncate'

type CmdPrefs = {
  groupByStatus?: boolean
}

export function MenuBar() {
  const { preferences } = useLocalPreferences()
  const { filterTodo } = useFilter()
  const { groupByStatus = true } = getPreferenceValues<CmdPrefs>()
  const { todos, error, isLoading, mutate } = useTodos({
    databaseId: preferences.databaseId,
    filter: filterTodo,
  })

  const { statuses } = useTodoList()

  const statusById = useMemo(() => {
    const map: Record<string, { id: string; name: string; color?: string }> = {}
    statuses?.forEach((s) => (map[s.id] = s))
    return map
  }, [statuses])

  const handleComplete = async (todo: Todo) => {
    await mutate(completeTodo(todo.id), {
      optimisticUpdate(data) {
        if (!data) return data
        return data.filter((t) => t.id !== todo.id)
      },
      shouldRevalidateAfter: true,
    })
  }

  const groupedTodos = useMemo(() => {
    if (!groupByStatus || !todos) return null
    return todos.reduce((acc, todo) => {
      const statusName = todo.status?.name || 'Unknown'
      ;(acc[statusName] ||= []).push(todo)
      return acc
    }, {} as Record<string, Todo[]>)
  }, [groupByStatus, todos])

  const renderItem = (todo: Todo) => {
    const { truncatedStr, isTruncated } = truncate(todo.title)
    const tintColor =
      (todo.status?.id && statusById[todo.status.id]?.color) ??
      Color.SecondaryText

    return (
      <MenuBarExtra.Item
        key={todo.id}
        onAction={() => handleComplete(todo)}
        icon={{
          source: getProgressIcon(
            getStatusGroup(todo.status?.name ?? '') === 'In progress' ? 0.5 : 0
          ),
          tintColor,
        }}
        title={truncatedStr}
        tooltip={isTruncated ? todo.title : undefined}
      />
    )
  }

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

      {!isLoading && !error && todos?.length === 0 ? (
        <MenuBarExtra.Item title="No Todos" />
      ) : null}

      {!error && todos?.length > 0 && (
        <>
          {groupByStatus && groupedTodos
            ? Object.keys(groupedTodos).map((status) => (
                <MenuBarExtra.Section key={status} title={status}>
                  {groupedTodos[status]?.map((todo) => renderItem(todo))}
                </MenuBarExtra.Section>
              ))
            : todos.map((todo) => renderItem(todo))}
        </>
      )}
    </MenuBarExtra>
  )
}
