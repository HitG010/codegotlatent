function DifficultyTag({ tag }) {
  return (
    <div>
        <p className={`px-3 py-1 rounded-full text-sm font-medium ${tag === 'Easy' ? 'bg-green-500/25 text-green-500' : tag === 'Medium' ? 'bg-yellow-500/25 text-yellow-500' : 'bg-red-500/25 text-red-500'}`}>
            {tag}
        </p>
    </div>
  )
}

export default DifficultyTag
