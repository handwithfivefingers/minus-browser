import React, { cloneElement } from 'react'
import {
  Controller,
  ControllerFieldState,
  ControllerRenderProps,
  FieldError,
  FieldValues,
  useFormContext,
  UseFormStateReturn,
} from 'react-hook-form'

import { cn } from '~/renderer/main-window/src/libs/cn'

interface FormControl {
  name: string
  children?: React.ReactNode
  className?: string
  render?: (renderProps: {
    field: ControllerRenderProps<FieldValues, string>
    fieldState: ControllerFieldState
    formState: UseFormStateReturn<FieldValues>
  }) => React.ReactElement
}
const FormControl = (props: FormControl) => {
  const form = useFormContext()
  const errors = form.formState.errors
  const recursiveObject = (obj: object, keys: string) => {
    let result = obj
    const split = keys.split('.')
    if (split.length) {
      for (const k of split) {
        if (k && k in result) {
          result = result[k as keyof typeof result]
        }
      }
    }
    return result
  }

  const error = recursiveObject(errors, props.name)
  const isError = !!(error as FieldError)?.message
  return (
    <div
      className={cn('flex flex-col gap-1', props?.className, {
        ['border-2 border-red-400/80']: isError,
      })}
    >
      <Controller
        name={props.name}
        control={form.control}
        render={
          props?.render
            ? props?.render
            : ({ field }) => {
                return cloneElement(props.children as React.ReactElement, {
                  ...(((props.children as React.ReactElement)?.props || {}) as object),
                  ...field,
                })
              }
        }
      />
      {(error as { message: string })?.message && (
        <span className="text-medium text-sm text-red-500">{(error as FieldError).message}</span>
      )}
    </div>
  )
}

export default FormControl
