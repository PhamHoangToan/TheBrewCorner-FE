import apiClient from '../config/axios'
import { createCrudService } from './crud.service'

export interface RecipeItem {
  id: string
  productId: string
  ingredientId: string
  quantity: number
  wastePercent: number
  unit: string
  ingredient: { id: string; name: string; unit: string }
}

export interface RecipeItemInput {
  ingredientId: string
  quantity: number
  wastePercent: number
  unit: string
}

export const productService = {
  ...createCrudService('/products'),
  getRecipes: (productId: string) =>
    apiClient.get<RecipeItem[]>(`/products/${productId}/recipes`),
  setRecipes: (productId: string, items: RecipeItemInput[]) =>
    apiClient.put<RecipeItem[]>(`/products/${productId}/recipes`, { items }),
}
