import { defineSignalComponent } from 'hydroactive';
import { useForm } from 'hydroactive/forms.js';
import { bind } from 'hydroactive/signal-accessors.js';

export const FormSubmit = defineSignalComponent('form-submit', (host) => {
  const form = useForm(host, host.query('form').access());

  form.onSubmit(async (data) => {
    console.log(`Submitting name: ${data.get('name')}`);

    const res = await fetch('/foo', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(data.entries()), null, 4),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(res.status);
  });

  {
    const form = host.query('form').access();
    form.listen(host, 'submit', (event) => {
      event.preventDefault();

      const data = new FormData(form.element);
      console.log(`Submitting name: ${data.get('name')}`);
    });
  }

  bind(host.query('#valid').access(), host, Boolean, form.valid);
});

declare global {
  interface HTMLElementTagNameMap {
    'form-submit': InstanceType<typeof FormSubmit>;
  }
}
