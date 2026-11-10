import {

  type ChangeEvent,

  type FormEvent,

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import {

  Link,

  useLocation,

  useNavigate,

  useParams,

} from "react-router-dom";



import {

  ApiRequestError,

  createAddress,

  getAddresses,

  updateAddress,

} from "../lib/api";

import type {

  AddressFormValues,

  SavedAddress,

} from "../types/commerce";



const EMPTY_FORM: AddressFormValues = {

  recipient_name: "",

  phone: "",

  alternate_phone: "",

  address_line1: "",

  address_line2: "",

  landmark: "",

  city: "",

  state: "",

  postal_code: "",

  country: "India",

  address_type: "home",

  latitude: "",

  longitude: "",

  is_default: false,

};



const ADDRESS_FORM_STYLES = `

  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");

  .react-address-form-page {

    --address-olive: #33371b;

    --address-olive-hover: #454b24;

    --address-olive-soft: #eef0e6;

    --address-ink: #242815;

    --address-muted: #626856;

    --address-border: #d9ddcc;
    --address-page-gutter: clamp(10px, 2vw, 36px);

    width: 100%;

    padding: 32px var(--address-page-gutter) 56px;

    box-sizing: border-box;

    background: #f7f7f2;

    color: var(--address-ink);

    font-family: "Nunito", Arial, Helvetica, sans-serif;

  }



  .react-address-form-page *,

  .react-address-form-page *::before,

  .react-address-form-page *::after {

    box-sizing: border-box;

    font-family: "Nunito", Arial, Helvetica, sans-serif !important;

  }



  .address-form-heading {

    display: flex;

    align-items: flex-end;

    justify-content: space-between;

    gap: 24px;

    margin-bottom: 24px;

  }



  .address-form-eyebrow {

    display: block;

    margin-bottom: 8px;

    color: var(--address-olive);

    font-size: 0.78rem;

    font-weight: 700;

    letter-spacing: 0.09em;

    text-transform: uppercase;

  }



  .address-form-heading h1 {

    margin: 0;

    color: var(--address-ink);

    font-size: clamp(2rem, 4vw, 3.05rem);

    line-height: 1.05;

    letter-spacing: -0.04em;

    font-weight: 600;

  }



  .address-form-heading p {

    max-width: 760px;

    margin: 10px 0 0;

    color: var(--address-muted);

    line-height: 1.55;

  }



  .address-form-button {

    min-height: 44px;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    padding: 11px 18px;

    border: 1px solid transparent;

    border-radius: 12px;

    font: inherit;

    font-size: 0.9rem;

    font-weight: 600;

    text-decoration: none;

    cursor: pointer;

    transition:

      transform 150ms ease,

      background-color 150ms ease,

      border-color 150ms ease;

  }



  .address-form-button:hover {

    transform: translateY(-1px);

  }



  .address-form-button:disabled {

    cursor: wait;

    opacity: 0.62;

    transform: none;

  }



  .address-form-button:focus-visible,

  .address-form-field input:focus-visible,

  .address-form-field select:focus-visible,

  .address-form-map a:focus-visible {

    outline: 3px solid rgba(51, 55, 27, 0.24);

    outline-offset: 3px;

  }



  .address-form-button-primary {

    border-color: var(--address-olive);

    background: var(--address-olive);

    color: #ffffff;

    box-shadow: 0 10px 24px rgba(51, 55, 27, 0.2);

  }



  .address-form-button-primary:hover {

    border-color: var(--address-olive-hover);

    background: var(--address-olive-hover);

    color: #ffffff;

  }



  .address-form-button-secondary {

    border-color: var(--address-border);

    background: #ffffff;

    color: var(--address-olive);

  }



  .address-form-button-secondary:hover {

    border-color: var(--address-olive);

    background: var(--address-olive-soft);

  }



  .address-form-card {

    padding: 24px;

    border: 1px solid var(--address-border);

    border-radius: 22px;

    background: #ffffff;

    box-shadow: 0 18px 46px rgba(51, 55, 27, 0.08);

  }



  .address-form-location-card {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 22px;

    margin-bottom: 14px;

    padding: 18px;

    border: 1px solid var(--address-border);

    border-radius: 16px;

    background: linear-gradient(135deg, var(--address-olive-soft), #fafaf6);

  }



  .address-form-location-card strong {

    color: var(--address-ink);

    font-weight: 600;

  }



  .address-form-location-card p {

    margin: 6px 0 0;

    color: var(--address-muted);

    line-height: 1.5;

  }



  .address-form-location-status {

    min-height: 22px;

    margin-bottom: 14px;

    color: var(--address-muted);

    font-size: 0.84rem;

    font-weight: 600;

  }



  .address-form-location-status.success {

    color: var(--address-olive);

  }



  .address-form-location-status.error {

    color: #b42332;

  }



  .address-form-grid {

    display: grid;

    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 17px;

  }



  .address-form-field {

    display: grid;

    gap: 7px;

    color: var(--address-ink);

    font-size: 0.84rem;

    font-weight: 600;

  }



  .address-form-field-wide {

    grid-column: 1 / -1;

  }



  .address-form-field input,

  .address-form-field select {

    width: 100%;

    min-height: 46px;

    padding: 10px 12px;

    border: 1px solid var(--address-border);

    border-radius: 11px;

    background: #ffffff;

    color: var(--address-ink);

    font: inherit;

    font-weight: 500;

    outline: none;

  }



  .address-form-field input:focus,

  .address-form-field select:focus {

    border-color: var(--address-olive);

    box-shadow: 0 0 0 3px rgba(51, 55, 27, 0.16);

  }



  .address-form-map {

    min-height: 42px;

    display: flex;

    align-items: center;

    margin-top: 18px;

    padding: 12px 14px;

    border: 1px dashed var(--address-border);

    border-radius: 12px;

    background: #fafaf6;

  }



  .address-form-map a {

    color: var(--address-olive);

    font-size: 0.86rem;

    font-weight: 600;

  }



  .address-form-map a:hover {

    color: var(--address-olive-hover);

  }



  .address-form-map-empty {

    color: var(--address-muted);

    font-size: 0.84rem;

  }



  .address-form-default {

    display: flex;

    align-items: center;

    gap: 10px;

    margin-top: 18px;

    color: var(--address-ink);

    font-size: 0.88rem;

    font-weight: 600;

  }



  .address-form-default input {

    width: 18px;

    height: 18px;

    accent-color: var(--address-olive);

  }



  .address-form-actions {

    display: flex;

    flex-wrap: wrap;

    gap: 11px;

    margin-top: 22px;

    padding-top: 20px;

    border-top: 1px solid var(--address-border);

  }



  .address-form-alert,

  .address-form-loading {

    margin-bottom: 20px;

    padding: 15px 17px;

    border-radius: 13px;

  }



  .address-form-alert {

    border: 1px solid #fecaca;

    background: #fff1f2;

    color: #9f1d2d;

    font-weight: 600;

  }



  .address-form-alert ul {

    margin: 9px 0 0;

    padding-left: 20px;

  }



  .address-form-loading {

    border: 1px solid var(--address-border);

    background: #ffffff;

    color: var(--address-muted);

    text-align: center;

  }



  @media (max-width: 1000px) {

    .react-address-form-page {

      width: 100%;

      max-width: none;

      padding-top: 28px;
      padding-right: var(--address-page-gutter);
      padding-bottom: 50px;
      padding-left: var(--address-page-gutter);

    }

  }



  @media (max-width: 700px) {

    .react-address-form-page {

      min-height: 100dvh;

      padding-top: 12px;
      padding-right: var(--address-page-gutter);
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
      padding-left: var(--address-page-gutter);

      background: #f7f7f2;

    }



    /* Compact mobile header: keep title and Back action on one row. */

    .address-form-heading {

      width: 100%;

      display: grid;

      grid-template-columns: minmax(0, 1fr) auto;

      align-items: center;

      gap: 9px;

      margin: 0 0 12px;

      padding: 2px 0 0;

    }



    .address-form-heading > div {

      min-width: 0;

    }



    .address-form-eyebrow,

    .address-form-heading p {

      display: none;

    }



    .address-form-heading h1 {

      margin: 0;

      font-size: clamp(1.42rem, 6.4vw, 1.72rem);

      line-height: 1.05;

      letter-spacing: -0.035em;

    }



    .address-form-heading .address-form-button {

      width: auto;

      min-height: 36px;

      padding: 7px 10px;

      border-radius: 9px;

      box-shadow: none;

      font-size: .7rem;

      white-space: nowrap;

    }



    .address-form-alert,

    .address-form-loading {

      margin-bottom: 10px;

      padding: 12px 11px;

      border-radius: 12px;

      font-size: .82rem;

      line-height: 1.35;

    }



    .address-form-alert ul {

      margin-top: 6px;

      padding-left: 17px;

    }



    /* Make the form feel like part of the page instead of a large desktop card. */

    .address-form-card {

      width: 100%;

      padding: 12px;

      border-radius: 15px;

      box-shadow: 0 8px 22px rgba(51, 55, 27, .055);

    }



    .address-form-location-card {

      align-items: stretch;

      flex-direction: column;

      gap: 10px;

      margin-bottom: 8px;

      padding: 11px;

      border-radius: 12px;

    }



    .address-form-location-card strong {

      font-size: .92rem;

      line-height: 1.1;

    }



    .address-form-location-card p {

      margin-top: 4px;

      font-size: .76rem;

      line-height: 1.35;

    }



    .address-form-location-card .address-form-button {

      width: 100%;

      min-height: 39px;

      padding: 8px 10px;

      border-radius: 9px;

      font-size: .76rem;

    }



    .address-form-location-status {

      min-height: 0;

      margin: 0 0 9px;

      padding: 0 2px;

      font-size: .73rem;

      line-height: 1.3;

    }



    .address-form-location-status:empty {

      display: none;

    }



    .address-form-grid {

      grid-template-columns: minmax(0, 1fr);

      gap: 10px;

    }



    .address-form-field-wide {

      grid-column: auto;

    }



    .address-form-field {

      gap: 5px;

      font-size: .76rem;

      line-height: 1.2;

    }



    .address-form-field input,

    .address-form-field select {

      min-height: 43px;

      padding: 9px 10px;

      border-radius: 9px;

      font-size: 16px;

    }



    .address-form-map {

      min-height: 40px;

      margin-top: 11px;

      padding: 10px 11px;

      border-radius: 10px;

    }



    .address-form-map a,

    .address-form-map-empty {

      font-size: .75rem;

      line-height: 1.3;

    }



    .address-form-default {

      min-height: 40px;

      margin-top: 10px;

      padding: 8px 9px;

      gap: 8px;

      border: 1px solid var(--address-border);

      border-radius: 10px;

      background: #fafaf6;

      font-size: .78rem;

    }



    .address-form-default input {

      width: 17px;

      height: 17px;

      flex: 0 0 17px;

    }



    .address-form-actions {

      display: grid;

      grid-template-columns: minmax(0, 1.35fr) minmax(0, .9fr);

      gap: 7px;

      margin-top: 12px;

      padding-top: 11px;

    }



    .address-form-actions .address-form-button {

      width: 100%;

      min-width: 0;

      min-height: 40px;

      padding: 8px 7px;

      border-radius: 9px;

      font-size: .76rem;

      white-space: nowrap;

    }



    .address-form-actions .address-form-button-primary {

      box-shadow: none;

    }

  }



  @media (max-width: 390px) {

    .react-address-form-page {

      --address-page-gutter: 10px;

    }



    .address-form-heading {

      gap: 6px;

    }



    .address-form-heading h1 {

      font-size: 1.34rem;

    }



    .address-form-heading .address-form-button {

      padding-inline: 8px;

      font-size: .66rem;

    }



    .address-form-card {

      padding: 10px;

      border-radius: 13px;

    }



    .address-form-location-card {

      padding: 10px;

    }



    .address-form-grid {

      gap: 9px;

    }



    .address-form-actions {

      grid-template-columns: minmax(0, 1.25fr) minmax(0, .85fr);

      gap: 6px;

    }



    .address-form-actions .address-form-button {

      min-height: 38px;

      font-size: .71rem;

    }

  }

  /* ================================================================
     ADDRESS FORM — SAME HORIZONTAL GUTTER AS PUBLIC ORDER PAGE
     ================================================================ */
  @media (min-width: 1700px) {
    .react-address-form-page {
      --address-page-gutter: clamp(32px, 2.5vw, 96px);
    }
  }

  @media (max-width: 1439px) {
    .react-address-form-page {
      --address-page-gutter: clamp(12px, 1.8vw, 24px);
    }
  }

  @media (max-width: 900px) {
    .react-address-form-page {
      --address-page-gutter: clamp(10px, 2vw, 18px);
    }
  }

  @media (max-width: 700px) {
    .react-address-form-page {
      --address-page-gutter: 10px;
    }
  }

  @media (max-width: 390px) {
    .react-address-form-page {
      --address-page-gutter: 10px;
    }
  }

  .react-address-form-page,
  .address-form-heading,
  .address-form-card,
  .address-form-alert,
  .address-form-loading {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .address-form-heading,
  .address-form-card,
  .address-form-alert,
  .address-form-loading {
    width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

`;

function savedAddressToForm(

  address: SavedAddress,

): AddressFormValues {

  const addressType =

    address.address_type === "work" ||

    address.address_type === "other"

      ? address.address_type

      : "home";



  return {

    recipient_name:

      address.recipient_name || "",

    phone: address.phone || "",

    alternate_phone:

      address.alternate_phone || "",

    address_line1:

      address.address_line1 || "",

    address_line2:

      address.address_line2 || "",

    landmark: address.landmark || "",

    city: address.city || "",

    state: address.state || "",

    postal_code:

      address.postal_code || "",

    country: address.country || "India",

    address_type: addressType,

    latitude:

      address.latitude === null ||

      address.latitude === undefined

        ? ""

        : String(address.latitude),

    longitude:

      address.longitude === null ||

      address.longitude === undefined

        ? ""

        : String(address.longitude),

    is_default:

      Boolean(address.is_default),

  };

}



function validateForm(

  form: AddressFormValues,

): string[] {

  const errors: string[] = [];



  if (form.recipient_name.trim().length < 2) {

    errors.push(

      "Enter the recipient's full name.",

    );

  }



  if (form.phone.trim().length < 8) {

    errors.push(

      "Enter a valid contact number.",

    );

  }



  if (!form.address_line1.trim()) {

    errors.push(

      "House, flat, building, or street is required.",

    );

  }



  if (!form.city.trim()) {

    errors.push("City is required.");

  }



  if (!form.state.trim()) {

    errors.push("State is required.");

  }



  if (form.postal_code.trim().length < 4) {

    errors.push(

      "Enter a valid postal code.",

    );

  }



  // Store-managed shipping uses postcode rules; GPS is optional.
  if (form.latitude.trim() || form.longitude.trim()) {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.push("Enter valid GPS coordinates or leave both fields blank.");
    }
  }

  return errors;

}



function getBrowserPosition(

  options: PositionOptions,

): Promise<GeolocationPosition> {

  return new Promise(

    (resolve, reject) => {

      navigator.geolocation.getCurrentPosition(

        resolve,

        reject,

        options,

      );

    },

  );

}



async function captureBrowserLocation(): Promise<GeolocationPosition> {

  try {

    return await getBrowserPosition({

      enableHighAccuracy: true,

      timeout: 12000,

      maximumAge: 0,

    });

  } catch {

    return getBrowserPosition({

      enableHighAccuracy: false,

      timeout: 12000,

      maximumAge: 60000,

    });

  }

}



export function AddressFormPage() {

  const { addressId = "" } = useParams<{

    addressId?: string;

  }>();



  const editing =

    Boolean(addressId.trim());



  const navigate = useNavigate();

  const location = useLocation();



  const [form, setForm] =

    useState<AddressFormValues>(

      EMPTY_FORM,

    );



  const [loading, setLoading] =

    useState(editing);



  const [saving, setSaving] =

    useState(false);



  const [capturingLocation, setCapturingLocation] =

    useState(false);



  const [pageError, setPageError] =

    useState("");



  const [validationErrors, setValidationErrors] =

    useState<string[]>([]);



  const [

    locationStatus,

    setLocationStatus,

  ] = useState("");



  const [

    locationStatusType,

    setLocationStatusType,

  ] = useState<

    "" | "success" | "error"

  >("");



  const csrfTokenRef = useRef("");



  const pageTitle = editing

    ? "Edit Delivery Address"

    : "Add Delivery Address";



  const handleApiError = useCallback(

    (error: unknown) => {

      if (error instanceof ApiRequestError) {

        if (

          error.status === 401 ||

          error.code === "AUTH_REQUIRED"

        ) {

          const next = encodeURIComponent(

            `${location.pathname}${location.search}`,

          );



          navigate(

            `${error.loginUrl || "/react/login"}?next=${next}`,

            {

              replace: true,

            },

          );



          return;

        }



        if (error.csrfToken) {

          csrfTokenRef.current =

            error.csrfToken;

        }



        if (error.errors.length) {

          setValidationErrors(

            error.errors,

          );

        }



        setPageError(error.message);

        return;

      }



      setPageError(

        error instanceof Error

          ? error.message

          : "Unable to save the address.",

      );

    },

    [

      location.pathname,

      location.search,

      navigate,

    ],

  );



  const loadAddressData = useCallback(

    async () => {

      setLoading(true);

      setPageError("");



      try {

        const payload =

          await getAddresses();



        csrfTokenRef.current =

          payload.csrf_token;



        if (editing) {

          const selected =

            payload.addresses.find(

              (address) =>

                String(address.id) ===

                String(addressId),

            );



          if (!selected) {

            setPageError(

              "Delivery address not found.",

            );

            return;

          }



          setForm(

            savedAddressToForm(

              selected,

            ),

          );

        }

      } catch (error) {

        handleApiError(error);

      } finally {

        setLoading(false);

      }

    },

    [

      addressId,

      editing,

      handleApiError,

    ],

  );



  useEffect(() => {

    const timer = window.setTimeout(() => {

      void loadAddressData();

    }, 0);



    return () => {

      window.clearTimeout(timer);

    };

  }, [loadAddressData]);



  const mapUrl = useMemo(() => {

    const latitude =

      Number(form.latitude);



    const longitude =

      Number(form.longitude);



    if (

      !Number.isFinite(latitude) ||

      !Number.isFinite(longitude)

    ) {

      return "";

    }



    return (

      "https://www.openstreetmap.org/" +

      `?mlat=${encodeURIComponent(latitude)}` +

      `&mlon=${encodeURIComponent(longitude)}` +

      `#map=17/${encodeURIComponent(latitude)}` +

      `/${encodeURIComponent(longitude)}`

    );

  }, [

    form.latitude,

    form.longitude,

  ]);



  function updateField(

    event:

      | ChangeEvent<HTMLInputElement>

      | ChangeEvent<HTMLSelectElement>,

  ) {

    const { name } = event.target;



    const value =

      event.target instanceof

        HTMLInputElement &&

      event.target.type === "checkbox"

        ? event.target.checked

        : event.target.value;



    setForm((current) => ({

      ...current,

      [name]: value,

    }));



    setValidationErrors([]);

    setPageError("");

  }



  async function handleCaptureLocation() {

    if (!navigator.geolocation) {

      setLocationStatus(

        "This browser does not support location access.",

      );



      setLocationStatusType("error");

      return;

    }



    const secureContext =

      window.location.protocol ===

        "https:" ||

      window.location.hostname ===

        "localhost" ||

      window.location.hostname ===

        "127.0.0.1";



    if (!secureContext) {

      setLocationStatus(

        "Location access requires HTTPS or localhost.",

      );



      setLocationStatusType("error");

      return;

    }



    setCapturingLocation(true);

    setLocationStatus(

      "Getting current location…",

    );

    setLocationStatusType("");



    try {

      const position =

        await captureBrowserLocation();



      setForm((current) => ({

        ...current,

        latitude:

          position.coords.latitude.toFixed(

            7,

          ),

        longitude:

          position.coords.longitude.toFixed(

            7,

          ),

      }));



      setLocationStatus(

        `Location captured with approximately ${Math.round(

          position.coords.accuracy || 0,

        )} metre accuracy.`,

      );



      setLocationStatusType(

        "success",

      );

    } catch {

      setLocationStatus(

        "Unable to capture location. Enter coordinates manually.",

      );



      setLocationStatusType("error");

    } finally {

      setCapturingLocation(false);

    }

  }



  async function saveWithCsrf(

    csrfToken: string,

  ) {

    if (editing) {

      return updateAddress(

        addressId,

        form,

        csrfToken,

      );

    }



    return createAddress(

      form,

      csrfToken,

    );

  }



  async function handleSubmit(

    event: FormEvent<HTMLFormElement>,

  ) {

    event.preventDefault();



    const errors =

      validateForm(form);



    if (errors.length) {

      setValidationErrors(errors);

      setPageError(

        "Correct the address details.",

      );

      return;

    }



    setSaving(true);

    setPageError("");

    setValidationErrors([]);



    try {

      let csrfToken =

        csrfTokenRef.current;



      if (!csrfToken) {

        const fresh =

          await getAddresses();



        csrfToken =

          fresh.csrf_token;



        csrfTokenRef.current =

          csrfToken;

      }



      try {

        const result =

          await saveWithCsrf(

            csrfToken,

          );



        navigate(

          "/addresses",

          {

            replace: true,

            state: {

              message:

                result.message ||

                "Delivery address saved.",

            },

          },

        );

      } catch (error) {

        if (

          error instanceof ApiRequestError &&

          error.code === "CSRF_FAILED"

        ) {

          const fresh =

            await getAddresses();



          csrfTokenRef.current =

            fresh.csrf_token;



          const result =

            await saveWithCsrf(

              fresh.csrf_token,

            );



          navigate(

            "/addresses",

            {

              replace: true,

              state: {

                message:

                  result.message ||

                  "Delivery address saved.",

              },

            },

          );



          return;

        }



        throw error;

      }

    } catch (error) {

      handleApiError(error);

    } finally {

      setSaving(false);

    }

  }



  return (

    <>

      <style>{ADDRESS_FORM_STYLES}</style>



      <main className="react-address-form-page">

        <section className="address-form-heading">

          <div>

            <span className="address-form-eyebrow">

              Saved delivery locations

            </span>



            <h1>{pageTitle}</h1>



            <p>

              Add the street address and pincode.

              GPS coordinates are optional.

            </p>

          </div>



          <Link

            className="address-form-button address-form-button-secondary"

            to="/addresses"

          >

            Back to Addresses

          </Link>

        </section>



        {pageError ? (

          <section

            className="address-form-alert"

            role="alert"

          >

            {pageError}



            {validationErrors.length ? (

              <ul>

                {validationErrors.map(

                  (error) => (

                    <li key={error}>

                      {error}

                    </li>

                  ),

                )}

              </ul>

            ) : null}

          </section>

        ) : null}



        {loading ? (

          <section className="address-form-loading">

            Loading address…

          </section>

        ) : (

          <form

            className="address-form-card"

            onSubmit={(event) =>

              void handleSubmit(event)

            }

          >

            <section className="address-form-location-card">

              <div>

                <strong>

                  Delivery coordinates

                </strong>



                <p>

                  GPS is optional. The complete

                  delivery address and pincode

                  are required.

                </p>

              </div>



              <button

                className="address-form-button address-form-button-secondary"

                type="button"

                disabled={

                  capturingLocation ||

                  saving

                }

                onClick={() =>

                  void handleCaptureLocation()

                }

              >

                {capturingLocation

                  ? "Getting Location…"

                  : "Use My Current Location"}

              </button>

            </section>



            <div

              className={[

                "address-form-location-status",

                locationStatusType,

              ]

                .filter(Boolean)

                .join(" ")}

              role="status"

            >

              {locationStatus}

            </div>



            <div className="address-form-grid">

              <label className="address-form-field">

                Latitude



                <input

                  type="number"

                  step="any"

                  name="latitude"

                  value={form.latitude}

                  required

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                Longitude



                <input

                  type="number"

                  step="any"

                  name="longitude"

                  value={form.longitude}

                  required

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                Recipient full name



                <input

                  type="text"

                  name="recipient_name"

                  value={

                    form.recipient_name

                  }

                  required

                  autoComplete="name"

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                Contact number



                <input

                  type="tel"

                  name="phone"

                  value={form.phone}

                  required

                  autoComplete="tel"

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                Alternate contact number



                <input

                  type="tel"

                  name="alternate_phone"

                  value={

                    form.alternate_phone

                  }

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                Address type



                <select

                  name="address_type"

                  value={

                    form.address_type

                  }

                  onChange={updateField}

                >

                  <option value="home">

                    Home

                  </option>



                  <option value="work">

                    Work

                  </option>



                  <option value="other">

                    Other

                  </option>

                </select>

              </label>



              <label className="address-form-field address-form-field-wide">

                House / Flat / Building /

                Street



                <input

                  type="text"

                  name="address_line1"

                  value={

                    form.address_line1

                  }

                  required

                  autoComplete="address-line1"

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field address-form-field-wide">

                Area / Locality



                <input

                  type="text"

                  name="address_line2"

                  value={

                    form.address_line2

                  }

                  autoComplete="address-line2"

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                Landmark



                <input

                  type="text"

                  name="landmark"

                  value={form.landmark}

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                City



                <input

                  type="text"

                  name="city"

                  value={form.city}

                  required

                  autoComplete="address-level2"

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                State



                <input

                  type="text"

                  name="state"

                  value={form.state}

                  required

                  autoComplete="address-level1"

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                PIN / Postal code



                <input

                  type="text"

                  name="postal_code"

                  value={

                    form.postal_code

                  }

                  required

                  autoComplete="postal-code"

                  onChange={updateField}

                />

              </label>



              <label className="address-form-field">

                Country



                <input

                  type="text"

                  name="country"

                  value={form.country}

                  required

                  autoComplete="country-name"

                  onChange={updateField}

                />

              </label>

            </div>



            <div className="address-form-map">

              {mapUrl ? (

                <a

                  target="_blank"

                  rel="noopener noreferrer"

                  href={mapUrl}

                >

                  Open delivery point on map

                </a>

              ) : (

                <span className="address-form-map-empty">

                  Enter valid coordinates to

                  view the delivery point.

                </span>

              )}

            </div>



            <label className="address-form-default">

              <input

                type="checkbox"

                name="is_default"

                checked={form.is_default}

                onChange={updateField}

              />



              Make this my default address

            </label>



            <div className="address-form-actions">

              <button

                className="address-form-button address-form-button-primary"

                type="submit"

                disabled={saving}

              >

                {saving

                  ? "Saving…"

                  : "Save Address"}

              </button>



              <Link

                className="address-form-button address-form-button-secondary"

                to="/addresses"

              >

                Cancel

              </Link>

            </div>

          </form>

        )}

      </main>

    </>

  );

}
