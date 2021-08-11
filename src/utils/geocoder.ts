import NodeGeocoder, {Geocoder, Options, Query} from 'node-geocoder';
import {CONFIGURATIONS} from '../config'

export const location_api = new class {
    private geocoder: Geocoder;

    constructor(geocoder_settings: Options) {
        this.geocoder = NodeGeocoder(geocoder_settings)
    }

    public find_location(query: Query | string) {
        return this.geocoder.geocode(query);
    }

}(CONFIGURATIONS.GEO_CODER);
