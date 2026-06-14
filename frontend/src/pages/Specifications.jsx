import { useMemo, useState } from 'react'
import { Plus, Save, Trash2, X } from 'lucide-react'
import { api } from '../api/client.js'
import { EmptyState } from '../components/EmptyState.jsx'

const emptyUsage = { ingredient_id: '', qty: '' }

const initialForm = {
  dish_id: '',
  name: '标准份',
  serving_size: '',
  sale_price: '',
  ingredients: [],
  packaging_cost: '',
}

export function Specifications({ dishes, specifications, ingredients, refresh }) {
  const [form, setForm] = useState(initialForm)

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const addUsage = () => {
    setForm((current) => ({ ...current, ingredients: [...current.ingredients, { ...emptyUsage }] }))
  }

  const updateUsage = (idx, field, value) => {
    setForm((current) => {
      const next = [...current.ingredients]
      next[idx] = { ...next[idx], [field]: value }
      return { ...current, ingredients: next }
    })
  }

  const removeUsage = (idx) => {
    setForm((current) => {
      const next = current.ingredients.filter((_, i) => i !== idx)
      return { ...current, ingredients: next }
    })
  }

  const previewCost = useMemo(() => {
    let total = 0
    for (const usage of form.ingredients) {
      const ing = ingredients.find((i) => i.id === usage.ingredient_id)
      if (ing && usage.qty) {
        total += Number(usage.qty) * ing.avg_price
      }
    }
    if (form.packaging_cost) {
      total += Number(form.packaging_cost)
    }
    return total.toFixed(2)
  }, [form.ingredients, form.packaging_cost, ingredients])

  const submit = async (event) => {
    event.preventDefault()
    await api.createSpecification({
      dish_id: form.dish_id,
      name: form.name,
      serving_size: form.serving_size,
      sale_price: Number(form.sale_price),
      ingredients: form.ingredients
        .filter((u) => u.ingredient_id && u.qty)
        .map((u) => ({ ingredient_id: u.ingredient_id, qty: Number(u.qty) })),
      packaging_cost: Number(form.packaging_cost || 0),
    })
    setForm(initialForm)
    refresh()
  }

  const remove = async (spec) => {
    await api.deleteSpecification(spec.id)
    refresh()
  }

  const dishName = (id) => dishes.find((dish) => dish.id === id)?.name || '未知菜品'
  const ingredientName = (id) => ingredients.find((i) => i.id === id)

  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-title">
          <h2>规格与价格</h2>
          <span>{specifications.length} 个规格</span>
        </div>
        {specifications.length === 0 ? (
          <EmptyState text="还没有规格" />
        ) : (
          <div className="card-grid">
            {specifications.map((spec) => (
              <article className="spec-card" key={spec.id}>
                <div>
                  <span>{dishName(spec.dish_id)}</span>
                  <h3>{spec.name}</h3>
                </div>
                <dl>
                  <div><dt>出品量</dt><dd>{spec.serving_size}</dd></div>
                  <div><dt>售价</dt><dd>¥{spec.sale_price}</dd></div>
                  <div><dt>原料成本(实时)</dt><dd>¥{spec.ingredient_cost.toFixed(2)}</dd></div>
                  <div><dt>毛利率</dt><dd>{Math.round(spec.gross_margin * 100)}%</dd></div>
                </dl>
                <div className="spec-ingredients">
                  {spec.ingredients && spec.ingredients.length > 0 ? (
                    <div className="usage-list">
                      {spec.ingredients.map((u, i) => {
                        const ing = ingredientName(u.ingredient_id)
                        return (
                          <span className="usage-tag" key={i}>
                            {ing?.name || u.ingredient_id} {u.qty}{ing?.unit || ''}
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <small>未配置原料</small>
                  )}
                </div>
                <button className="danger icon-only" onClick={() => remove(spec)} type="button" title="删除规格">
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel side-panel">
        <div className="section-title">
          <h2>新增规格</h2>
          <Plus size={18} />
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            关联菜品
            <select value={form.dish_id} onChange={(event) => updateField('dish_id', event.target.value)} required>
              <option value="">选择菜品</option>
              {dishes.map((dish) => (
                <option key={dish.id} value={dish.id}>{dish.name}</option>
              ))}
            </select>
          </label>
          <label>
            规格名称
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
          </label>
          <label>
            出品量
            <input value={form.serving_size} onChange={(event) => updateField('serving_size', event.target.value)} placeholder="例如 250g" required />
          </label>
          <label>
            售价
            <input type="number" min="0" step="0.1" value={form.sale_price} onChange={(event) => updateField('sale_price', event.target.value)} required />
          </label>

          <div className="usage-section">
            <div className="usage-header">
              <strong>原料用量</strong>
              <button type="button" className="icon-button labeled" onClick={addUsage}>
                <Plus size={14} />
                添加原料
              </button>
            </div>
            {form.ingredients.length === 0 ? (
              <small className="hint">暂未配置原料，点击上方按钮添加</small>
            ) : (
              <div className="usage-form-list">
                {form.ingredients.map((usage, idx) => {
                  const selectedIng = ingredients.find((i) => i.id === usage.ingredient_id)
                  return (
                    <div className="usage-form-row" key={idx}>
                      <select
                        value={usage.ingredient_id}
                        onChange={(e) => updateUsage(idx, 'ingredient_id', e.target.value)}
                        required
                      >
                        <option value="">选择原料</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name} (¥{ing.avg_price}/{ing.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={selectedIng?.unit || '数量'}
                        value={usage.qty}
                        onChange={(e) => updateUsage(idx, 'qty', e.target.value)}
                        required
                      />
                      <button type="button" className="danger icon-only" onClick={() => removeUsage(idx)} title="移除">
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <label>
            包装/损耗成本
            <input type="number" min="0" step="0.1" value={form.packaging_cost} onChange={(event) => updateField('packaging_cost', event.target.value)} />
          </label>

          <div className="cost-preview">
            <span>预计总成本(实时)</span>
            <b>¥{previewCost}</b>
          </div>

          <button className="primary" type="submit">
            <Save size={16} />
            <span>保存规格</span>
          </button>
        </form>
      </section>
    </div>
  )
}

