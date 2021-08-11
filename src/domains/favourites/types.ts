export type add_clinic_to_favourites_payload = {
    user_id: string
    clinic_id: string | string[]
};

export type remove_clinic_from_favourites_payload = {
    user_id: string,
    clinic_id: string
}

export type get_user_favourite_clinics_payload = {
    user_id: string
}

export type add_pharmacy_to_favourites_payload = {
    user_id: string
    pharmacy_id: number | number[]
};

export type remove_pharmacy_from_favourites_payload = {
    user_id: string,
    pharmacy_id: number
}

export type get_user_favourite_pharmacies_payload = {
    user_id: string
}
