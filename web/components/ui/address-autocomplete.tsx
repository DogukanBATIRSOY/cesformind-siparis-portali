'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, X } from 'lucide-react'

interface AddressResult {
  address: string
  district: string
  city: string
  postalCode?: string
  country: string
  latitude?: number
  longitude?: number
  formattedAddress: string
}

interface AddressAutocompleteProps {
  value?: string
  onAddressSelect: (result: AddressResult) => void
  placeholder?: string
  disabled?: boolean
  error?: string
}

declare global {
  interface Window {
    google: any
    initGoogleMaps: () => void
  }
}

export function AddressAutocomplete({
  value,
  onAddressSelect,
  placeholder = 'Adres aramak için yazmaya başlayın...',
  disabled = false,
  error,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [inputValue, setInputValue] = useState(value || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  // Google Maps API Script yükle
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const existingScript = document.getElementById('google-maps-script')
      
      if (!existingScript) {
        setIsLoading(true)
        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=tr&region=TR`
        script.async = true
        script.defer = true
        
        script.onload = () => {
          setIsScriptLoaded(true)
          setIsLoading(false)
        }
        
        script.onerror = () => {
          console.error('Google Maps script yüklenemedi')
          setIsLoading(false)
        }
        
        document.head.appendChild(script)
      } else {
        // Script zaten yüklenmiş, google objesi hazır mı kontrol et
        const checkGoogle = setInterval(() => {
          if (window.google) {
            setIsScriptLoaded(true)
            clearInterval(checkGoogle)
          }
        }, 100)
        
        // 5 saniye sonra kontrol etmeyi bırak
        setTimeout(() => clearInterval(checkGoogle), 5000)
      }
    } else if (window.google) {
      setIsScriptLoaded(true)
    }
  }, [])

  // Autocomplete başlat
  useEffect(() => {
    if (isScriptLoaded && inputRef.current && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'tr' },
            fields: ['address_components', 'formatted_address', 'geometry', 'name'],
          }
        )

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          
          if (!place.address_components) {
            return
          }

          const addressResult = parseGooglePlace(place)
          setInputValue(addressResult.formattedAddress)
          onAddressSelect(addressResult)
        })
      } catch (error) {
        console.error('Autocomplete başlatılamadı:', error)
      }
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isScriptLoaded, onAddressSelect])

  // Value değiştiğinde input'u güncelle
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value)
    }
  }, [value])

  const parseGooglePlace = (place: any): AddressResult => {
    const addressComponents = place.address_components || []
    
    let streetNumber = ''
    let route = ''
    let neighborhood = ''
    let district = ''
    let city = ''
    let postalCode = ''
    let country = 'Türkiye'

    for (const component of addressComponents) {
      const types = component.types

      if (types.includes('street_number')) {
        streetNumber = component.long_name
      }
      if (types.includes('route')) {
        route = component.long_name
      }
      if (types.includes('neighborhood') || types.includes('sublocality_level_1')) {
        neighborhood = component.long_name
      }
      if (types.includes('administrative_area_level_2') || types.includes('sublocality')) {
        district = component.long_name
      }
      if (types.includes('administrative_area_level_1')) {
        city = component.long_name
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name
      }
      if (types.includes('country')) {
        country = component.long_name
      }
    }

    // Eğer district bulunamadıysa neighborhood kullan
    if (!district && neighborhood) {
      district = neighborhood
    }

    // Adres parçalarını birleştir
    const addressParts = []
    if (neighborhood) addressParts.push(neighborhood)
    if (route) addressParts.push(route)
    if (streetNumber) addressParts.push(`No: ${streetNumber}`)
    
    const address = addressParts.length > 0 
      ? addressParts.join(', ')
      : place.formatted_address?.split(',')[0] || ''

    return {
      address,
      district,
      city,
      postalCode,
      country,
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
      formattedAddress: place.formatted_address || '',
    }
  }

  const handleClear = () => {
    setInputValue('')
    onAddressSelect({
      address: '',
      district: '',
      city: '',
      country: 'Türkiye',
      formattedAddress: '',
    })
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`pl-10 pr-10 ${error ? 'border-red-500' : ''}`}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {inputValue && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <p className="text-xs text-amber-600 mt-1">
          Google Maps API key tanımlanmamış. Manuel adres girişi yapabilirsiniz.
        </p>
      )}
    </div>
  )
}
