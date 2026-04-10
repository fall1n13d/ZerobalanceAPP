'use client'

import { useState } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export default function DateInput({ value, onChange, placeholder = 'MM/DD/YYYY', className = 'fi' }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 8) v = v.slice(0, 8)
    if (v.length >= 5) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4)
    else if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
    onChange(v)
  }

  return (
    <input
      className={className}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      maxLength={10}
    />
  )
}