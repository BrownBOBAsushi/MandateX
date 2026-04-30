import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TOKEN = process.env.MCP_BEARER_TOKEN!

function authError() {
  return NextResponse.json(
    { jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null },
    { status: 401 }
  )
}

function ok(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}

const TOOLS = [
  {
    name: 'list_docs',
    description: 'List all project documentation files. Returns id, name, category, version, updated_at.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
      },
    },
  },
  {
    name: 'get_doc',
    description: 'Get the full content of a document by name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Document name (e.g. "BUILD.md")' },
      },
      required: ['name'],
    },
  },
  {
    name: 'upsert_doc',
    description: 'Create or update a document. Saves a version snapshot automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        content: { type: 'string' },
        category: { type: 'string', description: 'Category tag (default: general)' },
        edited_by: { type: 'string', description: 'Who is making the edit' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'get_history',
    description: 'Get version history for a document.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Document name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'restore_version',
    description: 'Restore a document to a specific historical version.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'number', description: 'Version number to restore to' },
        edited_by: { type: 'string' },
      },
      required: ['name', 'version'],
    },
  },
  {
    name: 'delete_doc',
    description: 'Soft-delete a document (marks deleted=true, content preserved in history).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    },
  },
]

async function handleTool(name: string, args: Record<string, unknown>) {
  if (name === 'list_docs') {
    let q = supabase
      .from('project_docs')
      .select('id, name, category, version, updated_at')
      .eq('deleted', false)
      .order('updated_at', { ascending: false })

    if (args.category) {
      q = q.eq('category', args.category as string)
    }

    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data
  }

  if (name === 'get_doc') {
    const { data, error } = await supabase
      .from('project_docs')
      .select('*')
      .eq('name', args.name as string)
      .eq('deleted', false)
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  if (name === 'upsert_doc') {
    const docName = args.name as string
    const content = args.content as string
    const category = (args.category as string) || 'general'
    const editedBy = (args.edited_by as string) || 'claude'

    const { data: existing } = await supabase
      .from('project_docs')
      .select('id, version')
      .eq('name', docName)
      .single()

    if (existing) {
      const newVersion = existing.version + 1

      await supabase.from('project_docs_versions').insert({
        doc_id: existing.id,
        content,
        version: newVersion,
        edited_by: editedBy,
      })

      const { data, error } = await supabase
        .from('project_docs')
        .update({ content, category, version: newVersion, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    } else {
      const { data: inserted, error } = await supabase
        .from('project_docs')
        .insert({ name: docName, content, category, version: 1 })
        .select()
        .single()
      if (error) throw new Error(error.message)

      await supabase.from('project_docs_versions').insert({
        doc_id: inserted.id,
        content,
        version: 1,
        edited_by: editedBy,
      })

      return inserted
    }
  }

  if (name === 'get_history') {
    const { data: doc, error: docErr } = await supabase
      .from('project_docs')
      .select('id')
      .eq('name', args.name as string)
      .single()
    if (docErr) throw new Error(docErr.message)

    const { data, error } = await supabase
      .from('project_docs_versions')
      .select('version, edited_by, created_at')
      .eq('doc_id', doc.id)
      .order('version', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }

  if (name === 'restore_version') {
    const { data: doc, error: docErr } = await supabase
      .from('project_docs')
      .select('id, version')
      .eq('name', args.name as string)
      .single()
    if (docErr) throw new Error(docErr.message)

    const { data: snap, error: snapErr } = await supabase
      .from('project_docs_versions')
      .select('content')
      .eq('doc_id', doc.id)
      .eq('version', args.version as number)
      .single()
    if (snapErr) throw new Error(snapErr.message)

    const newVersion = doc.version + 1
    const editedBy = (args.edited_by as string) || 'claude'

    await supabase.from('project_docs_versions').insert({
      doc_id: doc.id,
      content: snap.content,
      version: newVersion,
      edited_by: editedBy,
    })

    const { data, error } = await supabase
      .from('project_docs')
      .update({ content: snap.content, version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', doc.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  if (name === 'delete_doc') {
    const { data, error } = await supabase
      .from('project_docs')
      .update({ deleted: true })
      .eq('name', args.name as string)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { deleted: true, name: data.name }
  }

  throw new Error(`Unknown tool: ${name}`)
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${TOKEN}`) return authError()

  let body: { jsonrpc: string; method: string; params?: unknown; id?: unknown }
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }

  const { method, params, id } = body

  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'mandatex-docs', version: '1.0.0' },
    })
  }

  if (method === 'tools/list') {
    return ok(id, { tools: TOOLS })
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> }
    try {
      const result = await handleTool(name, args || {})
      return ok(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      })
    } catch (e) {
      return rpcError(id, -32000, (e as Error).message)
    }
  }

  return rpcError(id, -32601, 'Method not found')
}
