import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import {
	Component,
	ComponentID,
	IComponentInstance,
	IComponentType,
	IComponentValue,
} from '../component'
import { Entity, EntityID, IComponentStore } from '../entity'
import { ISystem } from '../system'

export class Universe {
	private _entities: Entity[] = []
	private _components: Map<ComponentID, Map<EntityID, IComponentValue>> =
		new Map()
	private _systems: ISystem[] = []

	private createComponentStoreForEntity = (
		entityId: EntityID
	): IComponentStore => ({
		get: <T extends IComponentValue>(
			component: IComponentType<T>
		): O.Option<T> => {
			const comp = this._components.get(component.id)

			if (!comp) {
				return O.none
			}

			return O.fromNullable(comp.get(entityId) as T | undefined)
		},
		set: <T extends IComponentValue>(component: IComponentInstance<T>) => {
			this.setComponentValueForEntity(entityId, component)

			return E.right(undefined)
		},
		delete: <T extends IComponentValue>(component: IComponentType<T>) => {
			const comp = this._components.get(component.id)

			if (!comp) {
				return E.left(
					new Error(`Component ${component} does not exist in this universe`)
				)
			}

			comp.delete(entityId)
			return E.right(undefined)
		},
	})

	public addEntity(entity: Entity): void {
		entity._setComponentStore(this.createComponentStoreForEntity(entity.id))

		this._entities.push(entity)
	}

	public removeEntity(entity: Entity): void {
		const idx = this._entities.findIndex(e => e.id === entity.id)

		if (idx !== -1) {
			this._entities.splice(idx, 1)
		}

		this._components.forEach(component => {
			component.delete(entity.id)
		})
	}

	public listEntities(): Entity[] {
		return this._entities
	}

	public fetchAllValuesForComponent<T extends IComponentValue>(
		component: Component<T>
	): O.Option<Map<EntityID, T>> {
		const comp = this._components.get(component.id)

		if (!comp) {
			return O.none
		}

		return O.some(comp as Map<EntityID, T>)
	}

	public setComponentValueForEntity<T extends IComponentValue>(
		entityId: EntityID,
		component: IComponentInstance<T>
	): void {
		this._components.get(component.id)?.set(entityId, component.value) ??
			this._components.set(component.id, new Map([[entityId, component.value]]))
	}

	public removeComponent(componentId: ComponentID): void {
		this._components.delete(componentId)
	}

	public addSystem(system: ISystem): void {
		this._systems.push(system)
	}

	public listSystems(): ISystem[] {
		return this._systems
	}

	public removeSystem(system: ISystem): void {
		const idx = this._systems.findIndex(s => s === system)
		if (idx !== -1) {
			this._systems.splice(idx, 1)
		}
	}

	public update(deltaTime: number): void {
		for (const system of this._systems) {
			const entities = this._entities.filter(system.filter)
			system.update({ deltaTime, entities })
		}
	}
}
