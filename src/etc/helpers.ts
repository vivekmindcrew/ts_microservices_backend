import Validator, {ValidationError, ValidationSchema} from "fastest-validator";

export function Validate(getter: (args: any[]) => any, schema: ValidationSchema) {
    const validator = new Validator();

    const check = validator.compile(schema);

    return function (target: any, name: string, descriptor: PropertyDescriptor) {

        const original = descriptor.value;

        descriptor.value = async function (...args: any[]) {

            const validationResult: ValidationError[] | boolean = check(getter(args));

            if (Array.isArray(validationResult)) {
                const preconditionFailedEx = new Error(validationResult.map(err => err.message).join(' and '));
                preconditionFailedEx.statusCode = 412;
                throw preconditionFailedEx;
            }

            return original.call(this, ...args)
        };

        return descriptor;
    }
}
