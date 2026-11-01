import { desc } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { db } from './db'
import { notes } from './schema'

export default function App() {
  const [allNotes, setNotes] = useState<typeof notes.$inferSelect[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    db.select().from(notes).orderBy(desc(notes.createdAt)).then(setNotes)
  }, [])

  async function addNote() {
    if (!input.trim()) return
    await db.insert(notes).values({
      title: input,
      body: '',
      createdAt: Date.now()
    })
    setNotes(await db.select().from(notes).orderBy(desc(notes.createdAt)))
    setInput('')
  }

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Note title" />
      <button onClick={addNote}>Add</button>
      {allNotes.map((note) => (
        <div key={note.id}>{note.title}</div>
      ))}
    </div>
  )
}
